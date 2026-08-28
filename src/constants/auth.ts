export const AUTH_CONSTANTS = {
  passwordMinLength: 8,
  resetPasswordPath: "/reset-password",
  genericResetMessage: "If an account exists for that email, a reset link has been sent.",
} as const;

export const PASSWORD_REQUIREMENTS =
  "Password must be at least 8 characters and include at least one uppercase letter and one number.";

export const isValidPassword = (password: string) =>
  password.length >= AUTH_CONSTANTS.passwordMinLength &&
  /[A-Z]/.test(password) &&
  /\d/.test(password);
