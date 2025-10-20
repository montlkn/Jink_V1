import React, { useEffect, useRef, useState } from "react";
import { Text, TextProps } from "react-native";

type AnimatedSummaryTextProps = Omit<TextProps, "children"> & {
  text: string;
  isActive?: boolean;
  placeholder?: boolean;
  typingDelayMs?: number;
  showCursor?: boolean;
};

const CURSOR_CHARACTER = "▌";

const AnimatedSummaryText: React.FC<AnimatedSummaryTextProps> = ({
  text,
  isActive = true,
  placeholder = false,
  typingDelayMs = 26,
  showCursor = false,
  style,
  ...textProps
}) => {
  const [displayedText, setDisplayedText] = useState<string>(placeholder ? text : "");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousTextRef = useRef<string>(text);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const nextText = text || "";
    const hasChanged = previousTextRef.current !== nextText;

    if (!isActive || placeholder || !hasChanged) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayedText(nextText);
      previousTextRef.current = nextText;
      return;
    }

    previousTextRef.current = nextText;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setDisplayedText("");
    const delay = Math.max(typingDelayMs, 16);
    let index = 0;

    intervalRef.current = setInterval(() => {
      index += 1;
      setDisplayedText(nextText.slice(0, index));

      if (index >= nextText.length && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, delay);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, placeholder, text, typingDelayMs]);

  const shouldShowCursor =
    showCursor && !placeholder && displayedText.length < (text || "").length && isActive;

  return (
    <Text style={style} {...textProps}>
      {displayedText}
      {shouldShowCursor ? CURSOR_CHARACTER : ""}
    </Text>
  );
};

export default AnimatedSummaryText;
