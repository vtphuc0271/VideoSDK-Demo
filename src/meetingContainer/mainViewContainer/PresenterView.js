import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScreenShare, Close } from "@mui/icons-material";
import { useMeeting, useParticipant, VideoPlayer } from "@videosdk.live/react-sdk";
import { Box, Button, Typography, useTheme, IconButton } from "@mui/material";
import ParticipantViewer, { CornerDisplayName } from "./ParticipantViewer";
import useIsMobile from "../../utils/useIsMobile";
import {
  appEvents,
  eventEmitter,
  getGridForMainParticipants,
  getGridRowsAndColumns,
  localAndPinnedOnTop,
} from "../../utils/common";
import {
  meetingLayouts,
  appThemes,
  useMeetingAppContext,
} from "../../MeetingAppContextDef";
import { useMediaQuery } from "react-responsive";

const PresenterView = ({ presenterId }) => {
  const mMeeting = useMeeting();
  const {
    webcamOn,
    micOn,
    isLocal,
    screenShareAudioStream,
    screenShareOn,
    displayName,
    pin,
    unpin,
    pinState,
  } = useParticipant(presenterId);
  const toggleScreenShare = mMeeting?.toggleScreenShare;
  const localParticipantId = mMeeting?.localParticipant?.id;
  const pinnedParticipants = mMeeting?.pinnedParticipants;

  const isMobile = useIsMobile();
  const {
    selectedOutputDeviceId,
    setOverlaidInfoVisible,
    mainViewParticipants,
    meetingLayout,
    animationsEnabled,
    appTheme,
  } = useMeetingAppContext();
  const isPortrait = useMediaQuery({ query: "(orientation: portrait)" });

  const theme = useTheme();

  const [mouseOver, setMouseOver] = useState(false);
  const [controlsHover, setControlsHover] = useState(false); // State cho hover controls

  const mobilePortrait = isMobile && isPortrait;

  const { singleRow } = useMemo(() => {
    let mainParticipants = [...mainViewParticipants];

    const participants = localAndPinnedOnTop({
      localParticipantId,
      participants: mainParticipants,
      pinnedParticipantIds: [...pinnedParticipants.keys()],
      moveLocalUnpinnedOnTop:
        pinnedParticipants.size && meetingLayout !== meetingLayouts.GRID
          ? false
          : true,
    });

    const splicesActiveParticipants = participants.splice(0, 4);

    const gridInfo = getGridRowsAndColumns({
      participantsCount: splicesActiveParticipants.length,
    });

    return getGridForMainParticipants({
      participants: splicesActiveParticipants,
      gridInfo,
    });
  }, [
    mainViewParticipants,
    localParticipantId,
    pinnedParticipants,
    meetingLayout,
  ]);

  const audioPlayer = useRef();

  useEffect(() => {
    if (
      !isLocal &&
      audioPlayer.current &&
      screenShareOn &&
      screenShareAudioStream
    ) {
      const mediaStream = new MediaStream();
      mediaStream.addTrack(screenShareAudioStream.track);

      audioPlayer.current.srcObject = mediaStream;
      try {
        audioPlayer.current.setSinkId(selectedOutputDeviceId);
      } catch (error) {
        console.log("error", error);
      }
      audioPlayer.current.play().catch((err) => {
        if (
          err.message ===
          "play() failed because the user didn't interact with the document first. https://goo.gl/xX8pDD"
        ) {
          console.error("audio" + err.message);
        }
      });
    } else {
      audioPlayer.current.srcObject = null;
    }
  }, [screenShareAudioStream, screenShareOn, isLocal, selectedOutputDeviceId]);

  return (
    <div
      onMouseEnter={() => {
        setMouseOver(true);
      }}
      onMouseLeave={() => {
        setMouseOver(false);
      }}
      onDoubleClick={() => {
        eventEmitter.emit(appEvents["toggle-full-screen"]);
      }}
      onClick={() => {
        setOverlaidInfoVisible((s) => !s);
      }}
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        backgroundColor:
          appTheme === appThemes.DARK
            ? theme.palette.darkTheme.slightLighter
            : appTheme === appThemes.LIGHT
              ? theme.palette.lightTheme.two
              : "black",
        alignItems:
          mobilePortrait && meetingLayout !== meetingLayouts.SPOTLIGHT
            ? undefined
            : "center",
        justifyContent:
          mobilePortrait && meetingLayout !== meetingLayouts.SPOTLIGHT
            ? undefined
            : "center",
        display:
          mobilePortrait && meetingLayout !== meetingLayouts.SPOTLIGHT
            ? undefined
            : "flex",
      }}
    >
      <audio autoPlay playsInline controls={false} ref={audioPlayer} />

      <div
        style={{
          height: mobilePortrait ? "50%" : "100%",
          width: "100%",
          position: "relative",
        }}
        className={"video-contain"}
      >
        <>
          <VideoPlayer
            participantId={presenterId}
            type="share"
            containerStyle={{
              height: "100%",
              width: "100%",
            }}
            className={`h-full`}
            classNameVideo={`h-full`}
            // BỎ blur filter để xem rõ màn hình share
            // videoStyle={{
            //   filter: isLocal ? "blur(1rem)" : undefined,
            // }}
          />
        </>

        {isLocal && (
          <Box
            onMouseEnter={() => setControlsHover(true)}
            onMouseLeave={() => setControlsHover(false)}
            sx={{
              borderRadius: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor:
                appTheme === appThemes.DARK
                  ? theme.palette.darkTheme.slightLighter
                  : appTheme === appThemes.LIGHT
                    ? theme.palette.lightTheme.two
                    : "#333244",
              transition: `all ${300 * (animationsEnabled ? 1 : 0.5)}ms`,
              // Hiệu ứng mờ/rõ khi hover
              opacity: controlsHover ? 0.95 : 0.7,
              padding: controlsHover ? 3 : 1.5,
              minWidth: controlsHover ? 300 : 120,
              // Hiệu ứng scale nhỏ lại khi không hover
              transform: controlsHover 
                ? "translateX(-50%) scale(1)" 
                : "translateX(-50%) scale(0.9)",
            }}
          >
            {/* Minimal view khi không hover */}
            {!controlsHover && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ScreenShare
                  sx={{
                    color:
                      appTheme === appThemes.LIGHT
                        ? theme.palette.lightTheme.contrastText
                        : theme.palette.common.white,
                    fontSize: 20,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: "medium",
                    color:
                      appTheme === appThemes.LIGHT
                        ? theme.palette.lightTheme.contrastText
                        : theme.palette.common.white,
                    whiteSpace: "nowrap",
                  }}
                >
                  Presenting
                </Typography>
              </Box>
            )}

            {/* Full controls khi hover */}
            {controlsHover && (
              <>
                <ScreenShare
                  sx={{
                    color:
                      appTheme === appThemes.LIGHT
                        ? theme.palette.lightTheme.contrastText
                        : theme.palette.common.white,
                    fontSize: 32,
                    mb: 1,
                  }}
                />
                <Box sx={{ textAlign: "center", mb: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: "bold",
                      color:
                        appTheme === appThemes.LIGHT
                          ? theme.palette.lightTheme.contrastText
                          : theme.palette.common.white,
                    }}
                  >
                    You are presenting to everyone
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleScreenShare();
                  }}
                  sx={{
                    transition: `all ${200 * (animationsEnabled ? 1 : 0.5)}ms`,
                    transitionTimingFunction: "linear",
                    backgroundColor:
                      appTheme === appThemes.LIGHT || appTheme === appThemes.DARK
                        ? theme.palette.lightTheme.primaryMain
                        : theme.palette.primary.main,
                    "&:hover": {
                      backgroundColor:
                        appTheme === appThemes.LIGHT || appTheme === appThemes.DARK
                          ? theme.palette.lightTheme.primaryDark
                          : theme.palette.primary.dark,
                    },
                  }}
                >
                  Stop presenting
                </Button>
              </>
            )}
          </Box>
        )}
      </div>

      <CornerDisplayName
        {...{
          isLocal,
          displayName,
          micOn,
          webcamOn,
          pin,
          unpin,
          pinState,
          isPresenting: true,
          participantId: presenterId,
          mouseOver,
        }}
      />
      
      {mobilePortrait && meetingLayout !== meetingLayouts.SPOTLIGHT ? (
        <div
          style={{
            height: "50%",
            width: "100%",
            display: "flex",
            position: "relative",
          }}
        >
          {singleRow.map(
            ({
              participantId,
              relativeHeight,
              relativeWidth,
              relativeTop,
              relativeLeft,
            }) => {
              return (
                <div
                  style={{
                    padding: 8,
                    position: "absolute",
                    top: `${relativeTop}%`,
                    left: `${relativeLeft}%`,
                    width: `${relativeWidth}%`,
                    height: `${relativeHeight}%`,
                  }}
                  key={`presenter_participant_${participantId}`}
                >
                  <div
                    style={{
                      height: `calc(100% - ${2 * 8}px)`,
                      width: `calc(100% - ${2 * 8}px)`,
                    }}
                  >
                    <ParticipantViewer
                      participantId={participantId}
                      quality={"low"}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PresenterView;