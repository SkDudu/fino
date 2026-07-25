import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/constants/theme";

type Props = {
  /** Lado do squircle mint. Traço engrossa abaixo de 80/40. */
  size?: number;
};

const PATH_STEM = "M45 80 L45 30 C45 20 54 12 68 15";
const PATH_BAR = "M26 40 L78 40";

export function FinoMark({ size = 120 }: Props) {
  const stroke = size < 40 ? 13 : size < 80 ? 11 : 10;
  const glyphW = Math.round(size * 0.46);
  const glyphH = Math.round(size * 0.57);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.267),
        },
      ]}
    >
      <Svg width={glyphW} height={glyphH} viewBox="21 8 62 77" fill="none">
        <Path
          d={PATH_STEM}
          stroke={colors.buttonPrimaryText}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <Path
          d={PATH_BAR}
          stroke={colors.buttonPrimaryText}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
