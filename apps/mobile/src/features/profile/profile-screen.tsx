import { Text, View } from "react-native";
import { Button, Card } from "heroui-native";

import { Screen } from "@/components/screen";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { EmptyState } from "@/features/ui/empty-state";
import { MetadataDocumentCard } from "@/features/ui/metadata-document-card";
import { SectionHeader } from "@/features/ui/section-header";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";
import { useAuth } from "@/lib/auth-context";
import { buildAccountProfileModel } from "./profile-model";

export function ProfileScreenContent() {
  const { isAuthenticated, isPreview, profile, signOut, user } = useAuth();
  const snapshot = useLoopSnapshot();
  const documents = snapshot.documents ?? [];
  const profileModel = buildAccountProfileModel({
    isAuthenticated: isAuthenticated && !isPreview,
    user,
    profile,
  });

  return (
    <Screen title="Profile" subtitle="Reusable info and a metadata-only vault.">
      <Card className="gap-3 p-4" style={cardStyle}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text
              selectable
              style={{ color: colors.foreground, fontFamily: fonts.display, fontSize: 22 }}
            >
              {profileModel.accountTitle}
            </Text>
            <Text
              selectable
              style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}
            >
              {profileModel.accountDetail}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: profileModel.canSyncProfile ? "#EAF2DE" : "#EEEAE0",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text
              selectable
              style={{
                color: profileModel.canSyncProfile ? colors.success : colors.muted,
                fontFamily: fonts.semibold,
                fontSize: 12,
              }}
            >
              {profileModel.authBadge}
            </Text>
          </View>
        </View>
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
          {profileModel.privacyMode}
        </Text>
      </Card>

      <Card className="gap-4 p-4" style={cardStyle}>
        <View className="gap-1">
          <Text
            selectable
            style={{ color: colors.foreground, fontFamily: fonts.display, fontSize: 22 }}
          >
            Reusable profile
          </Text>
          <Text
            selectable
            style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 }}
          >
            Profile details are collected lazily. Real PII storage stays blocked until KMS,
            encryption, and counsel gates are cleared.
          </Text>
        </View>
        <View style={{ backgroundColor: "#EEEAE0", borderRadius: 999, height: 8 }}>
          <View
            style={{
              backgroundColor: colors.accent,
              borderRadius: 999,
              height: 8,
              width: `${profile?.completionPercent ?? snapshot.profile?.completionPercent ?? 0}%`,
            }}
          />
        </View>
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 13 }}>
          {profileModel.canSyncProfile
            ? profileModel.profileReadiness
            : `${snapshot.profile?.completionPercent ?? 0}% ready for local pre-fill preview`}
        </Text>
      </Card>

      <View className="gap-3">
        <SectionHeader title="Document vault" actionLabel="Metadata only" />
        {documents.length > 0 ? (
          documents.map((document) => (
            <MetadataDocumentCard key={document.id} document={document} />
          ))
        ) : (
          <EmptyState
            title="No document metadata"
            description="Add document type and expiry dates for reminders. File upload is not part of v1."
            actionLabel="Add metadata"
          />
        )}
      </View>

      <Card className="gap-3 p-4" style={cardStyle}>
        <Text
          selectable
          style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}
        >
          Account and privacy
        </Text>
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
          Export and delete entry points stay visible because store review and user trust require
          them.
        </Text>
        <View className="flex-row gap-3">
          <Button variant="outline" className="flex-1">
            Export data
          </Button>
          <Button variant="danger-soft" className="flex-1">
            Delete
          </Button>
        </View>
      </Card>

      <Button variant="outline" onPress={signOut}>
        Sign out
      </Button>
    </Screen>
  );
}
