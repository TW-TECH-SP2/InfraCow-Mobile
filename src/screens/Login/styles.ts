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

checkboxContainer: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 10,
  marginBottom: 20,
},

checkbox: {
  width: 18,
  height: 18,
  borderWidth: 1,
  borderColor: "#fff",
  marginRight: 8,
  borderRadius: 4,
},

checkboxChecked: {
  backgroundColor: "#fff",
},

checkboxText: {
  color: "#fff",
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