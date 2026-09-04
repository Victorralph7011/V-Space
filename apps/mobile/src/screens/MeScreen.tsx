import { View, Text, Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { updateSettings, type ThemePreference } from '@vspace/core';
import { useAuth } from '../lib/auth-context';
import { useThemeColors } from '../lib/theme';
import { type, radii, spacing } from '@vspace/tokens';

const THEME_LABEL: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const THEME_ORDER: readonly ThemePreference[] = ['light', 'dark', 'system'];

/** Profile, theme, and the AI toggle — the mobile counterpart to a settings
 *  screen the web app doesn't have yet as a dedicated page, but needs one
 *  place for account-level controls that aren't a section or the chat. */
export default function MeScreen() {
  const { user, profile, signOut } = useAuth();
  const colors = useThemeColors();

  if (!user || !profile) return null;

  const cycleTheme = () => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(profile.settings.theme) + 1) % THEME_ORDER.length]!;
    void updateSettings(user.uid, { theme: next });
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={{ color: colors.textInverse, fontWeight: '800', fontSize: type.title.fontSize }}>
            {profile.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{profile.displayName}</Text>
        <Text style={{ color: colors.textMuted, fontSize: type.bodySm.fontSize }}>{profile.email}</Text>
      </View>

      <View style={styles.section}>
        <Row
          icon="sun"
          label="Theme"
          value={THEME_LABEL[profile.settings.theme]}
          onPress={cycleTheme}
          colors={colors}
        />
        <Row
          icon="zap"
          label="Ralph (AI enrichment)"
          value={profile.settings.aiEnabled ? 'On' : 'Off'}
          onPress={() => updateSettings(user.uid, { aiEnabled: !profile.settings.aiEnabled })}
          colors={colors}
        />
        <Row
          icon="lock"
          label="Vault"
          value={profile.settings.vaultSalt ? 'Set up' : 'Not set up'}
          colors={colors}
        />
      </View>

      <Pressable
        onPress={() => signOut()}
        style={[styles.signOut, { borderColor: colors.borderStrong }]}
      >
        <Feather name="log-out" size={16} color={colors.overdue} />
        <Text style={{ color: colors.overdue, fontWeight: '700' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
  onPress?: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { borderColor: colors.border }]}
    >
      <View style={styles.rowLeft}>
        <Feather name={icon} size={16} color={colors.textMuted} />
        <Text style={{ color: colors.text, fontSize: type.body.fontSize }}>{label}</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: type.bodySm.fontSize }}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: spacing.xxl },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: { fontSize: type.heading.fontSize, fontWeight: '700' },
  section: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
  },
});
