import { Text, View } from "react-native";
import { Card } from "heroui-native";
import type { DocumentMetadata } from "@immigration/shared";

import { formatMonthDay } from "./date-format";
import { cardStyle, colors, fonts } from "./tokens";

interface MetadataDocumentCardProps {
  document: DocumentMetadata;
}

const statusCopy = {
  current: "Current",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  missing: "Missing",
};

export function MetadataDocumentCard({ document }: MetadataDocumentCardProps) {
  const statusColor = document.status === "expiring_soon" ? colors.warning : colors.success;

  return (
    <Card className="gap-3 p-4" style={cardStyle}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text
            selectable
            style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 16 }}
          >
            {document.title}
          </Text>
          <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
            {document.expiryDate ? `Expires ${formatMonthDay(document.expiryDate)}` : "No expiry"}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "#F8F6F0",
            borderCurve: "continuous",
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text selectable style={{ color: statusColor, fontFamily: fonts.medium, fontSize: 12 }}>
            {statusCopy[document.status]}
          </Text>
        </View>
      </View>
      {document.notes ? (
        <Text selectable style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 13 }}>
          {document.notes}
        </Text>
      ) : null}
    </Card>
  );
}
