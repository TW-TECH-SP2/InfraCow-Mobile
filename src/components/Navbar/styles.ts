import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  wrapper: {
  position: "absolute",
  bottom: 70,
  left: 0,
  right: 0,          
  alignItems: "center",
},

container: {
  flexDirection: "row",
  alignItems: "center",
  height: 70,
  paddingHorizontal: 15,

  borderRadius: 20,

  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 5 },
  elevation: 8,
},

  icon: {
  width: 45,
  height: 45,
  resizeMode: "contain",
  marginHorizontal: 5, 
},
androidGlass: {
  backgroundColor: "rgba(255,255,255,0.10)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.15)",
  elevation: 10,
},
});