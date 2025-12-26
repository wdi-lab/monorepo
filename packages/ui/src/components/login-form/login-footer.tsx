import { Text, ChakraLink } from '../../chakra';

export interface LoginFooterProps {
  signUpText?: string;
  signUpLinkText?: string;
  onSignUp?: () => void;
  show?: boolean;
}

export function LoginFooter({
  signUpText,
  signUpLinkText,
  onSignUp,
  show = true,
}: LoginFooterProps) {
  if (!show) {
    return null;
  }

  return (
    <Text textAlign="center" color="fg.muted">
      {signUpText}{' '}
      <ChakraLink
        colorPalette="teal"
        fontWeight="medium"
        onClick={onSignUp}
        cursor="pointer"
      >
        {signUpLinkText}
      </ChakraLink>
    </Text>
  );
}
