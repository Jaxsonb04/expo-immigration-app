import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card } from "heroui-native";

import { Screen } from "@/components/screen";
import { localLoopRepository } from "@/features/loop/repository";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { EmptyState } from "@/features/ui/empty-state";
import { SectionHeader } from "@/features/ui/section-header";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";

import { buildForumModel } from "./forum-model";

export function ForumScreenContent() {
  const snapshot = useLoopSnapshot();
  const [forum, setForum] = useState(() => snapshot.forum);
  const [reportMessage, setReportMessage] = useState<string | undefined>();
  const [blockMessage, setBlockMessage] = useState<string | undefined>();
  const model = useMemo(() => buildForumModel(forum), [forum]);

  function refreshForum() {
    setForum(localLoopRepository.getSnapshot().forum);
  }

  function reportPost(postId: string | undefined) {
    if (!postId) {
      return;
    }

    const result = localLoopRepository.saveForumReport({
      postId,
      reason: "unsafe_legal_advice",
      createdAt: new Date().toISOString(),
    });

    if (result.accepted) {
      setReportMessage("Report sent for moderator review.");
      refreshForum();
    }
  }

  function blockAuthor(authorPseudonymId: string) {
    const result = localLoopRepository.blockForumAuthor({ authorPseudonymId });

    if (result.accepted) {
      setBlockMessage("Author blocked locally.");
      refreshForum();
    }
  }

  return (
    <Screen title="Forum" subtitle="Peer support, not legal advice.">
      <Card className="gap-3 p-4" style={cardStyle}>
        <SectionHeader title="Safety first" actionLabel="Moderated" />
        <View className="gap-1">
          <Text selectable style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}>
            {model.safetyNotice.title}
          </Text>
          <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>
            {model.safetyNotice.body}
          </Text>
        </View>
      </Card>

      <View className="gap-3">
        <SectionHeader title="Categories" actionLabel="Pseudonymous" />
        {model.categories.length > 0 ? (
          model.categories.map((category) => (
            <Card key={category.id} className="gap-1 p-4" style={cardStyle}>
              <Text selectable style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}>
                {category.title}
              </Text>
              {category.description ? (
                <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>
                  {category.description}
                </Text>
              ) : null}
              <Text selectable style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 13 }}>
                {category.threadCount} visible {category.threadCount === 1 ? "thread" : "threads"}
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No categories yet"
            description="Moderated community spaces will appear here when they are available."
          />
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title="Recent threads" />
        {reportMessage ? (
          <Text selectable style={{ color: colors.success, fontFamily: fonts.medium, fontSize: 13 }}>
            {reportMessage}
          </Text>
        ) : null}
        {blockMessage ? (
          <Text selectable style={{ color: colors.success, fontFamily: fonts.medium, fontSize: 13 }}>
            {blockMessage}
          </Text>
        ) : null}
        {model.threads.length > 0 ? (
          model.threads.map((thread) => (
            <Card key={thread.id} className="gap-3 p-4" style={cardStyle}>
              <View className="gap-1">
                <Text selectable style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 12 }}>
                  {thread.categoryTitle} · {thread.statusLabel}
                </Text>
                <Text selectable style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}>
                  {thread.title}
                </Text>
                <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>
                  {thread.preview}
                </Text>
                <Text selectable style={{ color: colors.hint, fontFamily: fonts.medium, fontSize: 12 }}>
                  {thread.authorLabel} · {thread.replyCountLabel}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  isDisabled={!thread.reportPostId}
                  onPress={() => reportPost(thread.reportPostId)}
                  testID={`forum-report-post-${thread.reportPostId ?? thread.id}`}
                >
                  {thread.reportLabel}
                </Button>
                <Button
                  onPress={() => blockAuthor(thread.authorPseudonymId)}
                  testID={`forum-block-author-${thread.authorPseudonymId}`}
                  variant="outline"
                >
                  {thread.blockLabel}
                </Button>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No visible threads"
            description="Hidden, deleted, and locally blocked authors stay out of your community feed."
          />
        )}
      </View>
    </Screen>
  );
}
