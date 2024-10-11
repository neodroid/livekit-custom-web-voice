"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  LiveKitRoom,
  useVoiceAssistant,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  AgentState,
  DisconnectButton,
} from "@livekit/components-react";
import { useCallback, useEffect, useState,  } from "react";
import { MediaDeviceFailure } from "livekit-client";
import type { ConnectionDetails } from "../../api/connection-details/route";
import { CloseIcon } from "@/components/CloseIcon";
import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { useParams } from "next/navigation";
import AudioVisualizer from "@/components/AudioVisualizer";
import Image from 'next/image';

export default function Page() {
  const { roomId } = useParams();

  const logoUrl = "https://usebrainbase.com/bb_logo_white.svg";
  const backgroundColor = "#000";
  const foregroundColor = "#fff";
  const font = "'Messina Sans', 'Neue Machina', sans-serif";
  const buttonColor = "#F1F1F1";
  const buttonTextColor = "#373737";
  const buttonBorderColor = "transparent";

  const buttonStyles: React.CSSProperties = {
    backgroundColor: buttonColor,
    color: buttonTextColor,
    borderColor: buttonBorderColor,
    borderWidth: '1px',
    borderStyle: 'solid',
  };

  const [connectionDetails, updateConnectionDetails] = useState<
    ConnectionDetails | undefined
  >(undefined);
  const [agentState, setAgentState] = useState<AgentState>("disconnected");

  const onConnectButtonClicked = useCallback(async () => {
    if (!roomId) return;
    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ??
        "/api/connection-details",
      window.location.origin
    );
    url.searchParams.append("roomId", roomId.toString());
    const response = await fetch(url.toString());
    const connectionDetailsData = await response.json();
    updateConnectionDetails(connectionDetailsData);
  }, [roomId]);

  return (
    <>
    <header className="absolute top-0 left-0 p-4 flex items-center gap-4">
      <Image src={logoUrl} alt="Logo" width={30} height={30} />
      <h1 className="text-lg" style={{ color: foregroundColor, fontFamily: font }}>{roomId}</h1>
    </header>
    <main
      // data-lk-theme="default"
      className="h-full grid content-center"
      style={{ backgroundColor: backgroundColor, color: foregroundColor, fontFamily: font }}
    >
        <LiveKitRoom
          token={connectionDetails?.participantToken}
          serverUrl={connectionDetails?.serverUrl}
          connect={connectionDetails !== undefined}
          audio={true}
          video={false}
          onMediaDeviceFailure={onDeviceFailure}
          onDisconnected={() => {
            updateConnectionDetails(undefined);
          } }
          className="grid grid-rows-[2fr_1fr] items-center"
        >
          <SimpleVoiceAssistant onStateChange={setAgentState} />
          <ControlBar
            onConnectButtonClicked={onConnectButtonClicked}
            agentState={agentState}
            buttonStyles={buttonStyles}
          />
          <RoomAudioRenderer />
          {/* <NoAgentNotification state={agentState} /> */}
        </LiveKitRoom>
      </main></>
  );
}

interface SimpleVoiceAssistantProps {
  onStateChange: (state: AgentState) => void;
}

function SimpleVoiceAssistant({ onStateChange }: SimpleVoiceAssistantProps) {
  const { state, audioTrack } = useVoiceAssistant();

  useEffect(() => {
    onStateChange(state);
  }, [onStateChange, state]);

  const mediaStreamTrack = audioTrack?.publication?.track?.mediaStreamTrack || null;

  console.log('Agent State:', state);
  console.log('AudioTrack:', audioTrack);
  console.log('MediaStreamTrack:', mediaStreamTrack);
  console.log('MediaStreamTrack readyState:', mediaStreamTrack?.readyState);
  console.log('MediaStreamTrack muted:', mediaStreamTrack?.muted);
  
  return (
    <div className="h-[300px] max-w-[90vw] mx-auto">
      {state === "connecting" ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-5 w-5 border-4 border-t-transparent border-white-900"></div>
          <span className="ml-3 text-lg">Connecting...</span>
        </div>
      ) : mediaStreamTrack ? (
        <AudioVisualizer audioTrack={mediaStreamTrack} />
      ) : (
        <></>
      )}
    </div>
  );
}

function ControlBar(props: {
  onConnectButtonClicked: () => void;
  agentState: AgentState;
  buttonStyles: React.CSSProperties;
}) {
  const krisp = useKrispNoiseFilter();
  useEffect(() => {
    krisp.setNoiseFilterEnabled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-[100px]">
      <AnimatePresence>
        {props.agentState === "disconnected" && (
          <motion.button
            initial={{ opacity: 0, top: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, top: "-10px" }}
            transition={{ duration: 1, ease: [0.09, 1.04, 0.245, 1.055] }}
            className="uppercase absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-md"
            onClick={() => props.onConnectButtonClicked()}
            style={props.buttonStyles} // Apply custom styles here
          >
            Call Now
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {props.agentState !== "disconnected" &&
          props.agentState !== "connecting" && (
            <motion.div
              initial={{ opacity: 0, top: "10px" }}
              animate={{ opacity: 1, top: 0 }}
              exit={{ opacity: 0, top: "-10px" }}
              transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
              className="flex h-8 absolute left-1/2 -translate-x-1/2  justify-center"
            >
              <VoiceAssistantControlBar controls={{ leave: false }} />
              <DisconnectButton>
                <CloseIcon />
              </DisconnectButton>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

function onDeviceFailure(error?: MediaDeviceFailure) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}
