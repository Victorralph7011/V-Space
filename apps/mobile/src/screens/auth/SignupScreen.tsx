import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../lib/auth-context';
import { useThemeColors } from '../../lib/theme';
import { Field } from '../../components/Field';
import { Button } from '../../components/Button';
import { friendlyAuthError } from '@vspace/core';
import { type, spacing } from '@vspace/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const { signUpEmail } = useAuth();
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signUpEmail(email.trim(), password, name);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.mark, { backgroundColor: colors.accent }]} />
      <Text style={[styles.title, { color: colors.text }]}>Create your space</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>One account. Everything you save.</Text>

      <View style={styles.form}>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />

        {error && <Text style={{ color: colors.overdue, fontSize: type.bodySm.fontSize }}>{error}</Text>}

        <Button loading={loading} fullWidth onPress={handleSubmit}>
          Create account
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={{ color: colors.textMuted, fontSize: type.bodySm.fontSize }}>Already have a space? </Text>
        <Text
          onPress={() => navigation.navigate('Login')}
          style={{ color: colors.text, fontWeight: '700', fontSize: type.bodySm.fontSize }}
        >
          Sign in
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  mark: { width: 44, height: 44, borderRadius: 20, marginBottom: spacing.lg },
  title: { fontSize: type.title.fontSize, fontWeight: '800' },
  subtitle: { fontSize: type.bodySm.fontSize, marginTop: 6, marginBottom: spacing.xxl },
  form: { width: '100%', maxWidth: 360, gap: spacing.md },
  footer: { flexDirection: 'row', marginTop: spacing.huge / 2 },
});
