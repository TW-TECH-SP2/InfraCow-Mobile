import { StyleSheet } from "react-native";

import { fonts } from '../../styles/fonts';
const styles = StyleSheet.create({
container: {
  flex: 1,
  paddingHorizontal: 25,
  paddingTop: 60,
},

topContent: {
  width: "100%",
  marginBottom: 30,
},

backgroundformuser: {
  ...StyleSheet.absoluteFill,
  resizeMode: "cover",
},

voltar: {
  width: 40,
  height: 40,
  marginBottom: 25,
},

logopequena: {
  width: 69,
  height: 33,
},

form: {
  width: "100%",
},

title: {
  fontSize: 32,
  fontWeight: "bold",
  color: "#FFFFFF",
  marginBottom: 40,
},
input: {
  width: "100%",
  backgroundColor: "rgba(255, 255, 255, 0)",
  borderBottomColor: "#FFFFFF",
  borderBottomWidth: 2,
  padding: 12,
  color: "#fff",
  marginBottom: 15,
},

legendacampo: {
  color: "#fff",
  marginBottom: 5,
  marginTop: 10,
},

button: {
  backgroundColor: "#FFFFFF",
  padding: 15,
  borderRadius: 20,
  alignItems: "center",
  marginTop: 20,
},

buttonText: {
  fontWeight: 600,
  fontSize: 18,
  color: "#282113",
},
});

export default styles;