import { useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Button, Card } from "heroui-native";

import { Screen } from "@/components/screen";
import { localLoopRepository } from "@/features/loop/repository";
import { useLoopSnapshot } from "@/features/loop/use-loop-snapshot";
import { EmptyState } from "@/features/ui/empty-state";
import { SectionHeader } from "@/features/ui/section-header";
import { cardStyle, colors, fonts } from "@/features/ui/tokens";

import { buildNewsModel } from "./news-model";

export function NewsScreenContent() {
  const snapshot = useLoopSnapshot();
  const [news, setNews] = useState(() => snapshot.news);
  const [readMessage, setReadMessage] = useState<string | undefined>();
  const model = useMemo(() => buildNewsModel(news), [news]);

  function refreshNews() {
    setNews(localLoopRepository.getSnapshot().news);
  }

  function markRead(itemId: string) {
    const result = localLoopRepository.saveNewsItemRead({
      itemId,
      openedAt: new Date().toISOString(),
    });

    if (result.accepted) {
      setReadMessage("News item marked read locally.");
      refreshNews();
    }
  }

  function openOfficialSource(url: string) {
    void Linking.openURL(url);
  }

  return (
    <Screen title="News" subtitle="Official source updates only.">
      <Card className="gap-3 p-4" style={cardStyle}>
        <SectionHeader title={model.safetyNotice.title} actionLabel="Editorial review" />
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>
          {model.safetyNotice.body}
        </Text>
      </Card>

      <View className="gap-3">
        <SectionHeader title="Latest updates" />
        {readMessage ? (
          <Text selectable style={{ color: colors.success, fontFamily: fonts.medium, fontSize: 13 }}>
            {readMessage}
          </Text>
        ) : null}
        {model.items.length > 0 ? (
          model.items.map((item) => (
            <Card key={item.id} className="gap-3 p-4" style={cardStyle} testID={`news-item-${item.id}`}>
              <View className="gap-1">
                <Text
                  selectable
                  style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 12 }}
                  testID={`news-item-source-${item.id}`}
                >
                  {item.sourceLabel}
                </Text>
                <Text selectable style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}>
                  {item.title}
                </Text>
                <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>
                  {item.summary}
                </Text>
                <Text
                  selectable
                  style={{ color: colors.hint, fontFamily: fonts.medium, fontSize: 12 }}
                  testID={`news-item-read-${item.id}-${item.readLabel.toLowerCase()}`}
                >
                  {item.publishedLabel} · {item.editorialLabel} · {item.readLabel}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {item.tagLabels.map((tag) => (
                  <View
                    key={tag}
                    style={{
                      backgroundColor: "#FBFAF6",
                      borderColor: colors.border,
                      borderCurve: "continuous",
                      borderRadius: 999,
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text selectable style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 12 }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
              <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }}>
                {item.url}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  onPress={() => markRead(item.id)}
                  testID={`news-mark-read-${item.id}`}
                >
                  {item.markReadLabel}
                </Button>
                <Button
                  onPress={() => openOfficialSource(item.url)}
                  testID={`news-open-source-${item.id}`}
                  variant="outline"
                >
                  {item.openLabel}
                </Button>
              </View>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No reviewed news"
            description="Draft and unofficial items stay hidden until an editor approves an official-source summary."
          />
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title="Sources" actionLabel="Government" />
        {model.sources.length > 0 ? (
          model.sources.map((source) => (
            <Card key={source.id} className="gap-2 p-4" style={cardStyle}>
              <Text selectable style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 15 }}>
                {source.title}
              </Text>
              <Text selectable style={{ color: colors.accent, fontFamily: fonts.medium, fontSize: 13 }}>
                {source.detail}
              </Text>
              <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }}>
                {source.url}
              </Text>
              <Text selectable style={{ color: colors.hint, fontFamily: fonts.medium, fontSize: 12 }}>
                {source.lastFetchedLabel}
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No active sources"
            description="Official USCIS and government feeds will appear here after review."
          />
        )}
      </View>
    </Screen>
  );
}
