import { FirebaseError } from 'firebase/app';

/**
 * Firebase Auth's error codes are accurate and unreadable ("auth/invalid-
 * credential"). This is the one place they get translated, so every auth
 * form — on web or mobile — shows the same message for the same failure
 * instead of each screen guessing. Pure translation, no platform dependency:
 * `firebase/app` is the same package on both.
 */
export function friendlyAuthError(error: unknown): string {
  if (!(error instanceof FirebaseError)) return 'Something went wrong. Try again.';

  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password do not match.';
    case 'auth/email-already-in-use':
      return 'An account already exists with that email.';
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was closed before finishing.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    default:
      return 'Something went wrong. Try again.';
  }
}
