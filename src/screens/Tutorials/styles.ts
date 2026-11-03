import { StyleSheet } from "react-native";
import { fonts } from '../../styles/fonts';
  
export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F2F2F2",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#282113",
  },
    subtitle: {
    fontSize: 18,
    color: "#2E2415",
    width: "80%",
    fontWeight: "500",
    marginBottom: 30,
    },
    videoCard:{
    marginBottom: 20,
    },
imageWrapper: {
  position: "relative",
  width: "100%",
  height: 190,
  borderRadius: 20,
  overflow: "hidden",
},

videoimage: {
  width: "100%",
  height: "100%",
  borderRadius: 20,
},

videoTitle: {
  position: "absolute",
  top: 12,
  left: 12,
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
  zIndex: 2,
},

playButton: {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: [
    { translateX: -25 },
    { translateY: -25 }
  ],
  zIndex: 2,
},

play: {
  width: 50,
  height: 50,
},



  imageWrapperPlaying: {
    height: 440,
    backgroundColor: "#000",
  },

  webview: {
    flex: 1,
    backgroundColor: "#000",
  },

  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },

  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  closeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  comingSoon: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 2,
  },

  comingSoonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  offlineBox: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 10,
    borderRadius: 12,
    zIndex: 3,
  },

  offlineText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },

  openLink: {
    marginTop: 8,
    fontSize: 13,
    color: "#4D5C52",
    fontWeight: "600",
    textAlign: "center",
  },
});