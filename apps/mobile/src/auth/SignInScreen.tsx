import { useSignIn } from '@clerk/expo';
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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clerkBusy = fetchStatus === 'fetching';

  const submit = async () => {
    if (clerkBusy || submitting) return;
    if (!identifier.trim() || !password) {
      setError('Enter your email or username and password.');
      return;
    }
    setSubmitting(true);
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
        setError('This account requires an additional sign-in factor that is not supported by this first mobile screen yet.');
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
      setSubmitting(false);
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
          <Pressable style={styles.button} onPress={() => void submit()} disabled={clerkBusy || submitting}>
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign in</Text>}
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
  input: { paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#cbb8a6', borderRadius: 10, backgroundColor: '#ffffff', color: '#2e241d' },
  error: { fontSize: 14, lineHeight: 20, color: '#9b3d2f' },
  button: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#6b452d' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});