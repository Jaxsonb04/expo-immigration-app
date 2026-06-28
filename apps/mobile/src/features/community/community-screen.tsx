import { useState } from "react";
import { Segment } from "heroui-native-pro";

import { Screen } from "@/components/screen";
import { ForumBody } from "@/features/forum/forum-screen";
import { NewsBody } from "@/features/news/news-screen";

type CommunityTab = "discussion" | "news";

export function CommunityScreenContent() {
  const [tab, setTab] = useState<CommunityTab>("discussion");

  return (
    <Screen title="Community" subtitle="Peer support and official updates.">
      <Segment value={tab} onValueChange={(value) => setTab(value as CommunityTab)}>
        <Segment.Group>
          <Segment.Indicator />
          <Segment.Item value="discussion">
            <Segment.Label>Discussion</Segment.Label>
          </Segment.Item>
          <Segment.Item value="news">
            <Segment.Label>News</Segment.Label>
          </Segment.Item>
        </Segment.Group>
      </Segment>
      {tab === "discussion" ? <ForumBody /> : <NewsBody />}
    </Screen>
  );
}
