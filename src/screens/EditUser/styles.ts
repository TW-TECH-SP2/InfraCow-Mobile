import { StyleSheet } from "react-native";
import { fonts } from '../../styles/fonts';

const styles = StyleSheet.create({
  container: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center", 
  padding: 20,
  overflow: "hidden",
},
backgroundformuser: {
    ...StyleSheet.absoluteFill,
    resizeMode: "cover",
  },
  rowlogo: {
  position: "absolute",
  top: 60,   
  left: 30,  
},
voltar:{
    width: 40,
    height: 40,
    marginBottom: 20,
},
logopequena: {
    width: 69,
    height: 33,
},
// formulario
form:{
    width: "100%",
    padding: 20,
    marginTop: 20,
},
title:{
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
  marginBottom: 30,
},

buttonText: {
  fontWeight: 600,
  fontSize: 18,
  color: "#282113",
},
 photoBox: {
  flexDirection: "row",
  alignItems: "center",
  borderRadius: 15,
  padding: 15,
  marginVertical: 10,
},

photoLeft: {
  width: 150,
  height: 150,
  backgroundColor: "#4C461A",
  borderRadius: 15,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12,
  borderColor: "#D3D3D3",
  borderWidth: 3,
  
},

cameraIcon: {
  width: 65,
  height: 65,
},

photoText: {
  flex: 1,
  color: "#d4d4d4",
  fontSize: 14,
},
photoPreview: {
  width: "100%",
  height: "100%",
  borderRadius: 15,
},
});

export default styles;