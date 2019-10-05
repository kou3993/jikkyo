/** @jsx jsx */
import React, {
  useRef,
  useMemo,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle
} from "react";
import { css, jsx } from "@emotion/core";

export type EventType =
  | "load"
  | "canplay"
  | "play"
  | "pause"
  | "seeking"
  | "seeked";

export interface Props {
  className?: string;
  src?: string;
  currentTime?: number;
  onEvent?: (type: EventType, currentTime: number, duration: number) => void;
  onClick?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export interface Methods {
  play: () => void;
  stop: () => void;
  toggle: () => boolean;
}

const event = (
  type: EventType,
  handler?: (type: EventType, currentTime: number, duration: number) => void
) => (e: React.SyntheticEvent<HTMLVideoElement>) => {
  if (!handler) return;
  const currentTime = type === "load" ? 0 : e.currentTarget.currentTime;
  const duration = type === "load" ? 0 : e.currentTarget.duration;
  handler(type, currentTime, duration);
};

const Video: React.FC<Props> = (
  { className, src, currentTime, onEvent, onTimeUpdate, onClick },
  ref
) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playing = useRef(false);
  const handleLoad = useMemo(() => event("load", onEvent), [onEvent]);
  const handleCanPlay = useMemo(() => event("canplay", onEvent), [onEvent]);
  const handlePlay = useMemo(() => event("play", onEvent), [onEvent]);
  const handlePause = useMemo(() => event("pause", onEvent), [onEvent]);
  const handleSeeking = useMemo(() => event("seeking", onEvent), [onEvent]);
  const handleSeeked = useMemo(() => event("seeked", onEvent), [onEvent]);
  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (!onTimeUpdate) return;
      onTimeUpdate(e.currentTarget.currentTime);
    },
    [onTimeUpdate]
  );

  // In iOS safari, the video cannnot be started playing without a user interaction
  // such as a mouse event, so we have to expose some methods to outside via ref.
  useImperativeHandle<any, Methods>(ref, () => ({
    play: () => {
      if (!videoRef.current) return;
      playing.current = true;
      videoRef.current.play();
    },
    stop: () => {
      if (!videoRef.current) return;
      playing.current = false;
      videoRef.current.pause();
    },
    toggle: () => {
      if (!videoRef.current) return false;
      const next = !playing.current;
      playing.current = next;
      if (next) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      return next;
    }
  }));

  useEffect(() => {
    if (!videoRef.current || typeof currentTime !== "number") return;
    if ((videoRef.current as any).fastSeek) {
      (videoRef.current as any).fastSeek(currentTime);
    } else {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    playing.current = false;
  }, [src]);

  return !src ? (
    <div
      onClick={onClick}
      css={css`
        width: 100%;
        height: 100%;
        object-fit: contain;
      `}
    />
  ) : (
    <video
      ref={videoRef}
      className={className}
      src={src}
      playsInline
      controls={false}
      onCanPlay={handleCanPlay}
      onPlay={handlePlay}
      onPause={handlePause}
      onSeeking={handleSeeking}
      onSeeked={handleSeeked}
      onLoadedMetadata={handleLoad}
      onTimeUpdate={handleTimeUpdate}
      onClick={onClick}
      css={css`
        width: 100%;
        height: 100%;
        object-fit: contain;
      `}
    />
  );
};

export default forwardRef<Methods, Props>(Video);
