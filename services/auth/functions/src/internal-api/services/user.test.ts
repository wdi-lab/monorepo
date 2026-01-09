import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { UserService } from './user.ts';
import { userRepository } from '../../db/main/user-repository.ts';

// Mock the user repository
vi.mock('../../db/main/user-repository.ts', () => ({
  userRepository: {
    findOrCreate: vi.fn(),
    addCognitoUser: vi.fn(),
    getById: vi.fn(),
    getByEmail: vi.fn(),
    setEmailVerified: vi.fn(),
  },
}));

const cognitoMock = mockClient(CognitoIdentityProviderClient);

const mockCognitoConfig = {
  userPoolId: 'us-east-1_TEST123',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    cognitoMock.reset();
    vi.clearAllMocks();
    service = new UserService(mockCognitoConfig);
  });

  describe('findOrCreateUser', () => {
    describe('when user exists in database', () => {
      it('should return username and ensure Cognito user exists and is tracked', async () => {
        const email = 'existing@example.com';
        const cognitoSub = 'cognito-sub-existing';
        const existingUser = {
          id: 'ulid-123',
          email,
          firstName: 'John',
          lastName: 'Doe',
          version: 1,
          emailVerified: false,
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: existingUser,
          created: false,
        });
        vi.mocked(userRepository.addCognitoUser).mockResolvedValue({
          ...existingUser,
          cognitoUsers: [
            {
              userPoolId: mockCognitoConfig.userPoolId,
              sub: cognitoSub,
              region: 'us-east-1',
            },
          ],
        });
        cognitoMock.on(AdminGetUserCommand).resolves({
          Username: email,
          UserAttributes: [{ Name: 'sub', Value: cognitoSub }],
        });

        const result = await service.findOrCreateUser(email);

        expect(result).toEqual(existingUser);
        expect(userRepository.findOrCreate).toHaveBeenCalledWith(email, {
          firstName: undefined,
          lastName: undefined,
        });

        // Verify Cognito check was made with user ID (not email)
        const getCalls = cognitoMock.commandCalls(AdminGetUserCommand);
        expect(getCalls).toHaveLength(1);
        expect(getCalls[0].args[0].input).toMatchObject({
          UserPoolId: mockCognitoConfig.userPoolId,
          Username: existingUser.id,
        });

        // Verify Cognito user tracking was added with full entry
        expect(userRepository.addCognitoUser).toHaveBeenCalledWith(
          existingUser.id,
          {
            userPoolId: mockCognitoConfig.userPoolId,
            sub: cognitoSub,
            region: 'us-east-1',
          }
        );
      });

      it('should not add duplicate Cognito tracking if already tracked', async () => {
        const email = 'existing@example.com';
        const existingUser = {
          id: 'ulid-123',
          email,
          firstName: 'John',
          lastName: 'Doe',
          version: 1,
          emailVerified: false,
          cognitoUsers: [
            {
              userPoolId: mockCognitoConfig.userPoolId,
              sub: 'cognito-sub-123',
              region: 'us-east-1',
            },
          ],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: existingUser,
          created: false,
        });

        const result = await service.findOrCreateUser(email);

        expect(result).toEqual(existingUser);

        // Verify addCognitoUser was NOT called since already tracked
        expect(userRepository.addCognitoUser).not.toHaveBeenCalled();
        // Verify Cognito was NOT called since already tracked
        const getCalls = cognitoMock.commandCalls(AdminGetUserCommand);
        expect(getCalls).toHaveLength(0);
      });

      it('should create Cognito user if not found in Cognito and track it', async () => {
        const email = 'existing@example.com';
        const cognitoSub = 'cognito-sub-new';
        const existingUser = {
          id: 'ulid-123',
          email,
          firstName: 'John',
          lastName: 'Doe',
          version: 1,
          emailVerified: false,
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: existingUser,
          created: false,
        });
        vi.mocked(userRepository.addCognitoUser).mockResolvedValue({
          ...existingUser,
          cognitoUsers: [
            {
              userPoolId: mockCognitoConfig.userPoolId,
              sub: cognitoSub,
              region: 'us-east-1',
            },
          ],
        });
        cognitoMock
          .on(AdminGetUserCommand)
          .rejects(new UserNotFoundException({ $metadata: {}, message: '' }));
        cognitoMock.on(AdminCreateUserCommand).resolves({
          User: {
            Attributes: [{ Name: 'sub', Value: cognitoSub }],
          },
        });
        cognitoMock.on(AdminSetUserPasswordCommand).resolves({});

        const result = await service.findOrCreateUser(email);

        expect(result).toEqual(existingUser);

        // Verify Cognito user was created with DB user ID as username and email_verified always true
        const createCalls = cognitoMock.commandCalls(AdminCreateUserCommand);
        expect(createCalls).toHaveLength(1);
        expect(createCalls[0].args[0].input).toMatchObject({
          UserPoolId: mockCognitoConfig.userPoolId,
          Username: existingUser.id,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
          ],
          MessageAction: 'SUPPRESS',
        });

        // Verify password was set with DB user ID as username
        const passwordCalls = cognitoMock.commandCalls(
          AdminSetUserPasswordCommand
        );
        expect(passwordCalls).toHaveLength(1);
        expect(passwordCalls[0].args[0].input).toMatchObject({
          UserPoolId: mockCognitoConfig.userPoolId,
          Username: existingUser.id,
          Permanent: true,
        });

        // Verify Cognito user tracking was added with full entry
        expect(userRepository.addCognitoUser).toHaveBeenCalledWith(
          existingUser.id,
          {
            userPoolId: mockCognitoConfig.userPoolId,
            sub: cognitoSub,
            region: 'us-east-1',
          }
        );
      });
    });

    describe('when user does not exist in database', () => {
      it('should create user in both DB and Cognito and track it', async () => {
        const email = 'new@example.com';
        const cognitoSub = 'cognito-sub-new';
        const userInfo = { firstName: 'Jane', lastName: 'Smith' };
        const newUser = {
          id: 'ulid-456',
          email,
          ...userInfo,
          version: 1,
          emailVerified: false,
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: newUser,
          created: true,
        });
        vi.mocked(userRepository.addCognitoUser).mockResolvedValue({
          ...newUser,
          cognitoUsers: [
            {
              userPoolId: mockCognitoConfig.userPoolId,
              sub: cognitoSub,
              region: 'us-east-1',
            },
          ],
        });
        cognitoMock
          .on(AdminGetUserCommand)
          .rejects(new UserNotFoundException({ $metadata: {}, message: '' }));
        cognitoMock.on(AdminCreateUserCommand).resolves({
          User: {
            Attributes: [{ Name: 'sub', Value: cognitoSub }],
          },
        });
        cognitoMock.on(AdminSetUserPasswordCommand).resolves({});

        const result = await service.findOrCreateUser(email, userInfo);

        expect(result).toEqual(newUser);

        // Verify findOrCreate was called with correct params
        expect(userRepository.findOrCreate).toHaveBeenCalledWith(email, {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
        });

        // Verify Cognito user was created with DB user ID as username and email_verified always true
        const createCalls = cognitoMock.commandCalls(AdminCreateUserCommand);
        expect(createCalls).toHaveLength(1);
        expect(createCalls[0].args[0].input).toMatchObject({
          UserPoolId: mockCognitoConfig.userPoolId,
          Username: newUser.id,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
          ],
          MessageAction: 'SUPPRESS',
        });

        // Verify password was set with DB user ID as username
        const passwordCalls = cognitoMock.commandCalls(
          AdminSetUserPasswordCommand
        );
        expect(passwordCalls).toHaveLength(1);
        expect(passwordCalls[0].args[0].input).toMatchObject({
          UserPoolId: mockCognitoConfig.userPoolId,
          Username: newUser.id,
          Permanent: true,
        });
        expect(userRepository.addCognitoUser).toHaveBeenCalledWith(newUser.id, {
          userPoolId: mockCognitoConfig.userPoolId,
          sub: cognitoSub,
          region: 'us-east-1',
        });
      });

      it('should create user in DB with no user info', async () => {
        const email = 'new@example.com';
        const cognitoSub = 'cognito-sub-no-info';
        const newUser = {
          id: 'ulid-456',
          email,
          version: 1,
          emailVerified: false,
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: newUser,
          created: true,
        });
        vi.mocked(userRepository.addCognitoUser).mockResolvedValue({
          ...newUser,
          cognitoUsers: [
            {
              userPoolId: mockCognitoConfig.userPoolId,
              sub: cognitoSub,
              region: 'us-east-1',
            },
          ],
        });
        cognitoMock
          .on(AdminGetUserCommand)
          .rejects(new UserNotFoundException({ $metadata: {}, message: '' }));
        cognitoMock.on(AdminCreateUserCommand).resolves({
          User: {
            Attributes: [{ Name: 'sub', Value: cognitoSub }],
          },
        });
        cognitoMock.on(AdminSetUserPasswordCommand).resolves({});

        const result = await service.findOrCreateUser(email);

        expect(result).toEqual(newUser);

        // Verify findOrCreate was called with undefined names
        expect(userRepository.findOrCreate).toHaveBeenCalledWith(email, {
          firstName: undefined,
          lastName: undefined,
        });
      });

      it('should track existing Cognito user if not already tracked', async () => {
        const email = 'new@example.com';
        const cognitoSub = 'cognito-sub-existing';
        const newUser = {
          id: 'ulid-456',
          email,
          version: 1,
          emailVerified: false,
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: newUser,
          created: true,
        });
        vi.mocked(userRepository.addCognitoUser).mockResolvedValue({
          ...newUser,
          cognitoUsers: [
            {
              userPoolId: mockCognitoConfig.userPoolId,
              sub: cognitoSub,
              region: 'us-east-1',
            },
          ],
        });
        // Cognito user exists (maybe created through another flow)
        cognitoMock.on(AdminGetUserCommand).resolves({
          Username: newUser.id,
          UserAttributes: [{ Name: 'sub', Value: cognitoSub }],
        });

        const result = await service.findOrCreateUser(email);

        expect(result).toEqual(newUser);

        // Verify Cognito lookup was made with user ID
        const getCalls = cognitoMock.commandCalls(AdminGetUserCommand);
        expect(getCalls).toHaveLength(1);
        expect(getCalls[0].args[0].input).toMatchObject({
          UserPoolId: mockCognitoConfig.userPoolId,
          Username: newUser.id,
        });

        // Verify Cognito user was NOT created since it exists
        const createCalls = cognitoMock.commandCalls(AdminCreateUserCommand);
        expect(createCalls).toHaveLength(0);

        // Verify Cognito user tracking was still added with full entry
        expect(userRepository.addCognitoUser).toHaveBeenCalledWith(newUser.id, {
          userPoolId: mockCognitoConfig.userPoolId,
          sub: cognitoSub,
          region: 'us-east-1',
        });
      });

      it('should always set Cognito email_verified to true regardless of DB emailVerified status', async () => {
        const email = 'unverified@example.com';
        const cognitoSub = 'cognito-sub-unverified';
        const newUser = {
          id: 'ulid-789',
          email,
          version: 1,
          emailVerified: false, // DB shows unverified
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: newUser,
          created: true,
        });
        vi.mocked(userRepository.addCognitoUser).mockResolvedValue({
          ...newUser,
          cognitoUsers: [
            {
              userPoolId: mockCognitoConfig.userPoolId,
              sub: cognitoSub,
              region: 'us-east-1',
            },
          ],
        });
        cognitoMock
          .on(AdminGetUserCommand)
          .rejects(new UserNotFoundException({ $metadata: {}, message: '' }));
        cognitoMock.on(AdminCreateUserCommand).resolves({
          User: {
            Attributes: [{ Name: 'sub', Value: cognitoSub }],
          },
        });
        cognitoMock.on(AdminSetUserPasswordCommand).resolves({});

        const result = await service.findOrCreateUser(email);

        expect(result).toEqual(newUser);

        // Verify Cognito user was created with email_verified: 'true' even though DB emailVerified is false
        const createCalls = cognitoMock.commandCalls(AdminCreateUserCommand);
        expect(createCalls).toHaveLength(1);
        expect(createCalls[0].args[0].input).toMatchObject({
          UserPoolId: mockCognitoConfig.userPoolId,
          Username: newUser.id,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
          ],
          MessageAction: 'SUPPRESS',
        });
      });
    });
  });

  describe('setEmailVerified', () => {
    it('should set emailVerified to true when looking up by email', async () => {
      const email = 'test@example.com';
      const existingUser = {
        id: 'ulid-123',
        email,
        version: 1,
        emailVerified: false,
        cognitoUsers: [],
      };

      vi.mocked(userRepository.getByEmail).mockResolvedValue(existingUser);
      vi.mocked(userRepository.setEmailVerified).mockResolvedValue({
        ...existingUser,
        emailVerified: true,
      });

      await service.setEmailVerified(email);

      expect(userRepository.getByEmail).toHaveBeenCalledWith(email);
      expect(userRepository.getById).not.toHaveBeenCalled();
      expect(userRepository.setEmailVerified).toHaveBeenCalledWith(
        existingUser.id,
        true
      );
    });

    it('should set emailVerified to true when looking up by ID', async () => {
      const userId = 'ulid-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        version: 1,
        emailVerified: false,
        cognitoUsers: [],
      };

      vi.mocked(userRepository.getById).mockResolvedValue(existingUser);
      vi.mocked(userRepository.setEmailVerified).mockResolvedValue({
        ...existingUser,
        emailVerified: true,
      });

      await service.setEmailVerified(userId);

      expect(userRepository.getById).toHaveBeenCalledWith(userId);
      expect(userRepository.getByEmail).not.toHaveBeenCalled();
      expect(userRepository.setEmailVerified).toHaveBeenCalledWith(
        userId,
        true
      );
    });

    it('should not update if user is already verified', async () => {
      const email = 'test@example.com';
      const existingUser = {
        id: 'ulid-123',
        email,
        version: 1,
        emailVerified: true, // Already verified
        cognitoUsers: [],
      };

      vi.mocked(userRepository.getByEmail).mockResolvedValue(existingUser);

      await service.setEmailVerified(email);

      expect(userRepository.getByEmail).toHaveBeenCalledWith(email);
      expect(userRepository.setEmailVerified).not.toHaveBeenCalled();
    });

    it('should not update if user does not exist', async () => {
      const email = 'nonexistent@example.com';

      vi.mocked(userRepository.getByEmail).mockResolvedValue(null);

      await service.setEmailVerified(email);

      expect(userRepository.getByEmail).toHaveBeenCalledWith(email);
      expect(userRepository.setEmailVerified).not.toHaveBeenCalled();
    });

    describe('error handling', () => {
      it('should propagate non-UserNotFoundException errors from Cognito', async () => {
        const email = 'test@example.com';
        const existingUser = {
          id: 'ulid-123',
          email,
          version: 1,
          emailVerified: false,
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: existingUser,
          created: false,
        });

        const error = new Error('Internal server error');
        error.name = 'InternalErrorException';
        cognitoMock.on(AdminGetUserCommand).rejects(error);

        await expect(service.findOrCreateUser(email)).rejects.toThrow(
          'Internal server error'
        );
      });

      it('should propagate database errors', async () => {
        const email = 'test@example.com';

        vi.mocked(userRepository.findOrCreate).mockRejectedValue(
          new Error('Database connection failed')
        );

        await expect(service.findOrCreateUser(email)).rejects.toThrow(
          'Database connection failed'
        );
      });

      it('should throw error when AdminGetUser response is missing sub attribute', async () => {
        const email = 'test@example.com';
        const existingUser = {
          id: 'ulid-123',
          email,
          version: 1,
          emailVerified: false,
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: existingUser,
          created: false,
        });
        cognitoMock.on(AdminGetUserCommand).resolves({
          Username: email,
          UserAttributes: [], // No sub attribute
        });

        await expect(service.findOrCreateUser(email)).rejects.toThrow(
          'Cognito user missing sub attribute'
        );
      });

      it('should throw error when AdminCreateUser response is missing sub attribute', async () => {
        const email = 'test@example.com';
        const existingUser = {
          id: 'ulid-123',
          email,
          version: 1,
          emailVerified: false,
          cognitoUsers: [],
        };

        vi.mocked(userRepository.findOrCreate).mockResolvedValue({
          user: existingUser,
          created: false,
        });
        cognitoMock
          .on(AdminGetUserCommand)
          .rejects(new UserNotFoundException({ $metadata: {}, message: '' }));
        cognitoMock.on(AdminCreateUserCommand).resolves({
          User: {
            Attributes: [], // No sub attribute
          },
        });

        await expect(service.findOrCreateUser(email)).rejects.toThrow(
          'Failed to get sub from created Cognito user'
        );
      });
    });
  });

  describe('region extraction', () => {
    it('should extract region from user pool id', () => {
      const service = new UserService({
        userPoolId: 'eu-west-1_ABC123',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });

      // We can't directly test private properties, but we can verify
      // behavior through addCognitoUser calls
      expect(service).toBeDefined();
    });

    it('should use provided region if specified', () => {
      const service = new UserService({
        userPoolId: 'us-east-1_ABC123',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        region: 'us-west-2', // Override region
      });

      expect(service).toBeDefined();
    });

    it('should throw for invalid user pool id format', () => {
      expect(() => {
        new UserService({
          userPoolId: 'invalid-format',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
        });
      }).toThrow('Invalid User Pool ID format');
    });
  });
});
