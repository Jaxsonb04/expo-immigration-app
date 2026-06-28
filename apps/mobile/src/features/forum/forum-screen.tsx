import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button, Label, Radio } from "heroui-native";
import { RadioButtonGroup } from "heroui-native-pro";
import { getReportReasonLabel, type ForumReportReason } from "@immigration/shared";

import { localLoopRepository } from "@/features/loop/repository";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { EmptyState } from "@/features/ui/empty-state";
import { GlassCard } from "@/features/ui/glass";
import { SectionHeader } from "@/features/ui/section-header";
import { colors, fonts } from "@/features/ui/tokens";

import { buildForumModel } from "./forum-model";

const REPORT_REASONS: readonly ForumReportReason[] = [
  "unsafe_legal_advice",
  "pii",
  "abuse",
  "spam",
  "other",
];

interface ReportTarget {
  postId: string;
  threadTitle: string;
}

/**
 * Forum content (no Screen wrapper) — rendered inside the Community tab's
 * Discussion segment.
 */
export function ForumBody() {
  const snapshot = useLoopSnapshot();
  const [forum, setForum] = useState(() => snapshot.forum);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState<ForumReportReason>("unsafe_legal_advice");
  const model = useMemo(() => buildForumModel(forum), [forum]);

  function refreshForum() {
    setForum(localLoopRepository.getSnapshot().forum);
  }

  function openReport(postId: string | undefined, threadTitle: string) {
    if (!postId) {
      return;
    }

    setReportReason("unsafe_legal_advice");
    setStatusMessage(undefined);
    setReportTarget({ postId, threadTitle });
  }

  function submitReport() {
    if (!reportTarget) {
      return;
    }

    const result = localLoopRepository.saveForumReport({
      postId: reportTarget.postId,
      reason: reportReason,
      createdAt: new Date().toISOString(),
    });

    if (result.accepted) {
      setStatusMessage(
        `Report sent: ${getReportReasonLabel(reportReason)}. A moderator will review it.`
      );
      setReportTarget(null);
      refreshForum();
    }
  }

  function blockAuthor(authorPseudonymId: string) {
    const result = localLoopRepository.blockForumAuthor({ authorPseudonymId });

    if (result.accepted) {
      setStatusMessage("Author blocked locally. Their threads stay out of your feed.");
      refreshForum();
    }
  }

  if (reportTarget) {
    return (
      <GlassCard elevated intensity={40} padding={18}>
        <View className="gap-3">
          <SectionHeader title="Report this thread" />
          <Text
            selectable
            style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}
          >
            “{reportTarget.threadTitle}”
          </Text>
          <Text
            selectable
            style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}
          >
            Choose a reason. Reports go to moderation review — never to USCIS.
          </Text>
          <RadioButtonGroup
            variant="secondary"
            value={reportReason}
            onValueChange={(value) => setReportReason(value as ForumReportReason)}
          >
            {REPORT_REASONS.map((reason) => (
              <RadioButtonGroup.Item key={reason} value={reason} testID={`forum-reason-${reason}`}>
                <Radio />
                <RadioButtonGroup.ItemContent>
                  <Label>{getReportReasonLabel(reason)}</Label>
                </RadioButtonGroup.ItemContent>
              </RadioButtonGroup.Item>
            ))}
          </RadioButtonGroup>
          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onPress={() => setReportTarget(null)}
              testID="forum-report-cancel"
            >
              Cancel
            </Button>
            <Button className="flex-1" onPress={submitReport} testID="forum-report-submit">
              Submit report
            </Button>
          </View>
        </View>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard padding={16}>
        <View className="gap-2">
          <SectionHeader title="Safety first" actionLabel="Moderated" />
          <Text
            selectable
            style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}
          >
            {model.safetyNotice.title}
          </Text>
          <Text
            selectable
            style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}
          >
            {model.safetyNotice.body}
          </Text>
        </View>
      </GlassCard>

      {statusMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          selectable
          style={{ color: colors.success, fontFamily: fonts.medium, fontSize: 13 }}
        >
          {statusMessage}
        </Text>
      ) : null}

      <View className="gap-3">
        <SectionHeader title="Categories" actionLabel="Pseudonymous" />
        {model.categories.length > 0 ? (
          model.categories.map((category) => (
            <GlassCard key={category.id} padding={16}>
              <View className="gap-1">
                <Text
                  selectable
                  style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}
                >
                  {category.title}
                </Text>
                {category.description ? (
                  <Text
                    selectable
                    style={{
                      color: colors.muted,
                      fontFamily: fonts.body,
                      fontSize: 13,
                      lineHeight: 20,
                    }}
                  >
                    {category.description}
                  </Text>
                ) : null}
                <Text
                  selectable
                  style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 13 }}
                >
                  {category.threadCount} visible{" "}
                  {category.threadCount === 1 ? "thread" : "threads"}
                </Text>
              </View>
            </GlassCard>
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
        {model.threads.length > 0 ? (
          model.threads.map((thread) => (
            <GlassCard key={thread.id} padding={16}>
              <View className="gap-3">
                <View className="gap-1">
                  <Text
                    selectable
                    style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 12 }}
                  >
                    {thread.categoryTitle} · {thread.statusLabel}
                  </Text>
                  <Text
                    selectable
                    style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}
                  >
                    {thread.title}
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: colors.muted,
                      fontFamily: fonts.body,
                      fontSize: 13,
                      lineHeight: 20,
                    }}
                  >
                    {thread.preview}
                  </Text>
                  <Text
                    selectable
                    style={{ color: colors.hint, fontFamily: fonts.medium, fontSize: 12 }}
                  >
                    {thread.authorLabel} · {thread.replyCountLabel}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    isDisabled={!thread.reportPostId}
                    onPress={() => openReport(thread.reportPostId, thread.title)}
                    testID={`forum-report-post-${thread.reportPostId ?? thread.id}`}
                  >
                    {thread.reportLabel}
                  </Button>
                  <Button
                    className="flex-1"
                    onPress={() => blockAuthor(thread.authorPseudonymId)}
                    testID={`forum-block-author-${thread.authorPseudonymId}`}
                    variant="outline"
                  >
                    {thread.blockLabel}
                  </Button>
                </View>
              </View>
            </GlassCard>
          ))
        ) : (
          <EmptyState
            title="No visible threads"
            description="Hidden, deleted, and locally blocked authors stay out of your community feed."
          />
        )}
      </View>
    </>
  );
}
