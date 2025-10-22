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
  const [showPreview, setShowPreview] = useState(true); // Thêm state cho preview
  const previewVideoRef = useRef(); // Ref cho preview video

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

  // Effect để lấy stream màn hình cho preview (chỉ cho local presenter)
  useEffect(() => {
    if (isLocal && screenShareOn && showPreview) {
      const getScreenPreview = async () => {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: "always"
            },
            audio: false // Không cần audio cho preview
          });

          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }

          // Khi người dùng stop sharing từ browser
          stream.getTracks().forEach(track => {
            track.onended = () => {
              if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = null;
              }
            };
          });
        } catch (error) {
          console.error("Error getting screen preview:", error);
        }
      };

      getScreenPreview();
    } else {
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = null;
      }
    };
  }, [isLocal, screenShareOn, showPreview]);

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

        {/* Preview Window cho Local Presenter */}
        {isLocal && showPreview && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 320,
              height: 180,
              backgroundColor: "black",
              borderRadius: 2,
              overflow: "hidden",
              boxShadow: 3,
              zIndex: 10,
            }}
          >
            <video
              ref={previewVideoRef}
              autoPlay
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
            {/* Preview Header */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(0,0,0,0.7)",
                p: 0.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "white",
                  fontWeight: "medium",
                  fontSize: "0.7rem",
                }}
              >
                Your Screen
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPreview(false);
                }}
                sx={{
                  color: "white",
                  p: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {isLocal && (
          <Box
            p={3}
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
              opacity: 0.9,
              minWidth: 300,
            }}
          >
            <ScreenShare
              style={{
                color:
                  appTheme === appThemes.LIGHT
                    ? theme.palette.lightTheme.contrastText
                    : theme.palette.common.white,
                height: theme.spacing(4),
                width: theme.spacing(4),
              }}
            />
            <Box mt={1}>
              <Typography
                variant="subtitle1"
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  color:
                    appTheme === appThemes.LIGHT
                      ? theme.palette.lightTheme.contrastText
                      : theme.palette.common.white,
                }}
              >
                You are presenting to everyone
              </Typography>
              {!showPreview && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.primary.main,
                    textAlign: "center",
                    display: "block",
                    mt: 0.5,
                    cursor: "pointer",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPreview(true);
                  }}
                >
                  Show preview
                </Typography>
              )}
            </Box>
            <Box mt={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleScreenShare();
                }}
                style={{
                  transition: `all ${200 * (animationsEnabled ? 1 : 0.5)}ms`,
                  transitionTimingFunction: "linear",
                  backgroundColor:
                    appTheme === appThemes.LIGHT || appTheme === appThemes.DARK
                      ? theme.palette.lightTheme.primaryMain
                      : theme.palette.primary.main,
                }}
              >
                Stop presenting
              </Button>
            </Box>
          </Box>
        )}
      </div>

      {/* Floating Preview Button khi preview bị tắt */}
      {isLocal && !showPreview && (
        <Button
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            setShowPreview(true);
          }}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            backgroundColor: theme.palette.primary.main,
            color: "white",
            borderRadius: 2,
            px: 2,
            py: 1,
            minWidth: "auto",
            zIndex: 10,
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
          startIcon={<ScreenShare sx={{ fontSize: 16 }} />}
        >
          <Typography variant="caption" sx={{ fontWeight: "medium" }}>
            Preview
          </Typography>
        </Button>
      )}

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