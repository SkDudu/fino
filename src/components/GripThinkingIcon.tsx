import { MotiView } from "moti";
import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";

const CIRCLES = [
  { cx: 19, cy: 5 },
  { cx: 19, cy: 12 },
  { cx: 12, cy: 5 },
  { cx: 19, cy: 19 },
  { cx: 12, cy: 12 },
  { cx: 5, cy: 5 },
  { cx: 12, cy: 19 },
  { cx: 5, cy: 12 },
  { cx: 5, cy: 19 },
] as const;

type Props = {
  size?: number;
  color?: string;
};

/** ponytail: Moti Views no grid 24² — evita motifySvg/SVG opacity quirks */
export function GripThinkingIcon({
  size = 28,
  color = colors.accent,
}: Props) {
  const scale = size / 24;
  const r = 1.25 * scale;

  return (
    <View style={{ width: size, height: size }}>
      {CIRCLES.map((c, index) => (
        <MotiView
          key={`${c.cx}-${c.cy}`}
          from={{ opacity: 1 }}
          animate={{ opacity: [1, 0.3, 0.3, 1] }}
          transition={{
            type: "timing",
            duration: 1100,
            delay: index * 70,
            loop: true,
          }}
          style={[
            styles.dot,
            {
              width: r * 2,
              height: r * 2,
              borderRadius: r,
              backgroundColor: color,
              left: c.cx * scale - r,
              top: c.cy * scale - r,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: "absolute" },
});
