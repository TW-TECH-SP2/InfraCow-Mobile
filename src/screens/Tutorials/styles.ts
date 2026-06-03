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
});