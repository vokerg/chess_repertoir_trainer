import { useSignIn, useSSO } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export function SignInScreen() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clerkBusy = fetchStatus === 'fetching';
  const busy = clerkBusy || passwordSubmitting || googleSubmitting;

  const submitGoogle = async () => {
    if (busy) return;
    setGoogleSubmitting(true);
    setError(null);
    try {
      const result = await startSSOFlow({ strategy: 'oauth_google' });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace('/');
        return;
      }
      if (result.authSessionResult?.type === 'cancel' || result.authSessionResult?.type === 'dismiss') {
        return;
      }
      setError('Google sign-in did not complete. Please try again.');
    } catch (caught) {
      setError(readClerkError(caught));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const submitPassword = async () => {
    if (busy) return;
    if (!identifier.trim() || !password) {
      setError('Enter your email or username and password.');
      return;
    }
    setPasswordSubmitting(true);
    setError(null);
    try {
      const passwordResult = await signIn.password({
        identifier: identifier.trim(),
        password,
      });
      if (passwordResult.error) {
        setError(readClerkError(passwordResult.error));
        return;
      }
      if (signIn.status !== 'complete') {
        setError('This account requires an additional sign-in factor that is not supported by this mobile screen yet.');
        return;
      }
      const finalizeResult = await signIn.finalize();
      if (finalizeResult.error) {
        setError(readClerkError(finalizeResult.error));
        return;
      }
      router.replace('/');
    } catch (caught) {
      setError(readClerkError(caught));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>MOBILE SIGN IN</Text>
          <Text style={styles.title}>Access your repertoire</Text>
          <Text style={styles.body}>
            Sign in once to download courses. Existing downloads remain available offline afterward.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            style={[styles.googleButton, busy ? styles.buttonDisabled : null]}
            onPress={() => void submitGoogle()}
            disabled={busy}
          >
            {googleSubmitting ? (
              <ActivityIndicator color="#2e241d" />
            ) : (
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR USE PASSWORD</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            accessibilityLabel="Email or username"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email or username"
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
          />
          <TextInput
            accessibilityLabel="Password"
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            style={[styles.button, busy ? styles.buttonDisabled : null]}
            onPress={() => void submitPassword()}
            disabled={busy}
          >
            {passwordSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign in with password</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function readClerkError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'longMessage' in error) {
    const longMessage = (error as { longMessage?: unknown }).longMessage;
    if (typeof longMessage === 'string' && longMessage) return longMessage;
  }
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
    const message = errors?.[0]?.longMessage ?? errors?.[0]?.message;
    if (message) return message;
  }
  return error instanceof Error ? error.message : 'Sign-in failed.';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5efe6' },
  keyboard: { flex: 1, justifyContent: 'center', padding: 22 },
  card: { gap: 13, padding: 22, borderRadius: 16, backgroundColor: '#fffaf4' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#6f513b' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: '#2e241d' },
  body: { fontSize: 15, lineHeight: 22, color: '#5a4a3f' },
  googleButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbb8a6',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  googleButtonText: { color: '#2e241d', fontSize: 16, fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#cbb8a6' },
  dividerText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: '#76675c' },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#cbb8a6',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    color: '#2e241d',
  },
  error: { fontSize: 14, lineHeight: 20, color: '#9b3d2f' },
  button: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#6b452d',
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});
