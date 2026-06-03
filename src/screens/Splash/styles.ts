import { StyleSheet } from "react-native";
import { fonts } from '../../styles/fonts';

const styles = StyleSheet.create({
  container: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden", 
},
  background: {
    ...StyleSheet.absoluteFill,
    resizeMode: "cover",
  },
  logo: {
  width: 315,
  height: 188,
  transform: [{ translateY: 150 }], 
},
});

export default styles;