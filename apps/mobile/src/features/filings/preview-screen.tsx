import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Button } from "heroui-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard, ScreenBackground } from "@/features/ui/glass";
import { colors, fonts, glass } from "@/features/ui/tokens";
import { loadI765Draft } from "./draft-store";
import { generateFilledI765, type FilledI765Result } from "./pdf/fill-i765";

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; result: FilledI765Result }
  | { status: "error"; message: string };

interface PreviewScreenProps {
  onClose: () => void;
}

export function PreviewScreenContent({ onClose }: PreviewScreenProps) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<PreviewState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [pdfRendering, setPdfRendering] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const answers = (await loadI765Draft()) ?? {};
        const result = await generateFilledI765(answers);
        if (active) setState({ status: "ready", result });
      } catch (error) {
        if (active) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not create the PDF.",
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt]);

  function handleRetry() {
    setPdfRendering(true);
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  async function handlePrint() {
    if (state.status !== "ready") return;
    try {
      setBusy(true);
      await Print.printAsync({ uri: state.result.uri });
    } catch {
      // User cancelled the print sheet — nothing to do.
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (state.status !== "ready") return;
    try {
      setBusy(true);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(state.result.uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: state.result.fileName,
        });
      }
    } catch {
      // User dismissed the share sheet.
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenBackground />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 14,
          gap: 14,
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontFamily: fonts.display,
              fontSize: 26,
              letterSpacing: -0.4,
            }}
          >
            Preview I-765
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={20}
            onPress={onClose}
            testID="preview-close"
          >
            <Text style={{ color: colors.accent, fontFamily: fonts.semibold, fontSize: 16 }}>
              Done
            </Text>
          </Pressable>
        </View>

        <GlassCard padding={14}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.semibold, fontSize: 14 }}>
            Filled on this device · edition 08/21/25
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.body,
              fontSize: 12,
              lineHeight: 18,
              marginTop: 4,
            }}
          >
            Print it, sign in black ink, and file it yourself. The app does not submit to USCIS.
            Review every box before filing.
          </Text>
        </GlassCard>

        <View
          style={{
            flex: 1,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: glass.borderSoft,
            backgroundColor: "#FFFFFF",
          }}
        >
          {state.status === "loading" ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
              <ActivityIndicator color={colors.accent} />
              <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 14 }}>
                Filling your form…
              </Text>
            </View>
          ) : state.status === "error" ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                gap: 8,
              }}
            >
              <Text style={{ color: colors.danger, fontFamily: fonts.semibold, fontSize: 15 }}>
                Couldn&apos;t create the PDF
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.body,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {state.message}
              </Text>
              <Button variant="outline" onPress={handleRetry} testID="preview-retry">
                Try again
              </Button>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <WebView
                source={{ uri: state.result.uri }}
                originWhitelist={["*"]}
                allowFileAccess
                allowFileAccessFromFileURLs
                onLoadEnd={() => setPdfRendering(false)}
                style={{ flex: 1, backgroundColor: "#FFFFFF" }}
                testID="preview-webview"
              />
              {pdfRendering ? (
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: "#FFFFFF",
                    bottom: 0,
                    gap: 12,
                    justifyContent: "center",
                    left: 0,
                    position: "absolute",
                    right: 0,
                    top: 0,
                  }}
                >
                  <ActivityIndicator color={colors.accent} />
                  <Text style={{ color: colors.muted, fontFamily: fonts.medium, fontSize: 14 }}>
                    Rendering your form…
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button
            variant="outline"
            className="flex-1"
            isDisabled={state.status !== "ready" || busy}
            onPress={handleShare}
            testID="preview-share"
          >
            Save / Share
          </Button>
          <Button
            className="flex-1"
            isDisabled={state.status !== "ready" || busy}
            onPress={handlePrint}
            testID="preview-print"
          >
            Print
          </Button>
        </View>
      </View>
    </View>
  );
}
