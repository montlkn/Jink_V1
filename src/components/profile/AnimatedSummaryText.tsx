import React, { useEffect, useRef, useState } from "react";
import { Text, TextProps } from "react-native";

type AnimatedSummaryTextProps = Omit<TextProps, "children"> & {
  text: string;
  isActive?: boolean;
  placeholder?: boolean;
  typingDelayMs?: number;
  showCursor?: boolean;
  animationKey?: string | number;
};

const CURSOR_CHARACTER = "▌";

const THINKING_MESSAGES = [
  "Analyzing architectural DNA...",
  "Consulting historical archives...",
  "Triangulating aesthetic patterns...",
  "Synthesizing stylistic preferences...",
  "Calibrating your architectural aura...",
];

const AnimatedSummaryText: React.FC<AnimatedSummaryTextProps> = ({
  text,
  isActive = true,
  placeholder = false,
  typingDelayMs = 26,
  showCursor = false,
  animationKey,
  style,
  ...textProps
}) => {
  const [displayedText, setDisplayedText] = useState<string>(placeholder ? text : "");
  const [thinkingMessage, setThinkingMessage] = useState(THINKING_MESSAGES[0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousTextRef = useRef<string>("");
  const animationKeyRef = useRef<typeof animationKey>(animationKey);
  const cursorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thinkingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Handle thinking messages
  useEffect(() => {
    const isThinking = isActive && !placeholder && (!text || text === "");
    
    if (isThinking) {
      if (!thinkingIntervalRef.current) {
        let msgIndex = 0;
        thinkingIntervalRef.current = setInterval(() => {
          msgIndex = (msgIndex + 1) % THINKING_MESSAGES.length;
          setThinkingMessage(THINKING_MESSAGES[msgIndex]);
        }, 2000);
      }
    } else {
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
        thinkingIntervalRef.current = null;
      }
    }

    return () => {
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
        thinkingIntervalRef.current = null;
      }
    };
  }, [isActive, placeholder, text]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
        thinkingIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const nextText = text || "";
    const keyChanged = animationKeyRef.current !== animationKey;
    animationKeyRef.current = animationKey;
    const hasChanged = previousTextRef.current !== nextText || keyChanged;
    const shouldAnimate = isActive && !placeholder && hasChanged && nextText !== "";

    if (!shouldAnimate) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!isActive || placeholder) {
        setDisplayedText(nextText);
      } else if (nextText === "") {
        setDisplayedText("");
      }
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
  }, [animationKey, isActive, placeholder, text, typingDelayMs]);

  const targetLength = (text || "").length;
  const isThinking = isActive && !placeholder && targetLength === 0;
  const shouldShowCursor =
    showCursor &&
    !placeholder &&
    isActive &&
    (displayedText.length < targetLength || targetLength === 0);

  useEffect(() => {
    if (!shouldShowCursor) {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
      setCursorVisible(false);
      return;
    }

    setCursorVisible(true);
    if (cursorIntervalRef.current) {
      clearInterval(cursorIntervalRef.current);
    }
    cursorIntervalRef.current = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 520);

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
      setCursorVisible(true);
    };
  }, [shouldShowCursor]);

  return (
    <Text style={style} {...textProps}>
      {isThinking ? thinkingMessage : displayedText}
      {shouldShowCursor ? (cursorVisible ? CURSOR_CHARACTER : " ") : ""}
    </Text>
  );
};

export default AnimatedSummaryText;
