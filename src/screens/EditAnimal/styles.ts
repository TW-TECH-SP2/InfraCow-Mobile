import { StyleSheet } from "react-native";
import { fonts } from '../../styles/fonts';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E9E9EB",
  },

  close: {
    padding: 20,
  },

  closeText: {
    fontSize: 22,
    color: "#000",
  },

  logo: {
    width: 77,
    height: 33,
    alignSelf: "center",
    marginBottom: 10,
    resizeMode: "contain",
  },

  formContainer: {
  backgroundColor: "#fff",
  width: "100%",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  marginTop: 10,
},

  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 25,
    color: "#282113",
    textAlign: "center",
  },

  input: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderColor: "#D3D3D3",
    borderWidth: 3,
    height: 50,
  },

selectBox: {
  borderWidth: 3,
  borderColor: "#D3D3D3",
  borderRadius: 20,
  backgroundColor: "#FFF",
  marginBottom: 12,
  height: 55,
  justifyContent: "center",
  paddingHorizontal: 10,
},
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
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
  backgroundColor: "#EBEBEB",
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
  color: "#4D5C52",
  fontSize: 14,
},

button: {
  backgroundColor: "#282113",
  padding: 15,
  borderRadius: 20,
  alignItems: "center",
  marginTop: 5,
  width: "100%",
  height: 50,
  alignSelf: "center", 
  marginBottom: 60,
},

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  inputLabel:{
    fontSize: 14,
    fontWeight: "600",
    color: "#4D5C52",
    textAlign: "left",
    marginBottom: 10,
  },
  halfField: {
  width: "48%",
},
selectWrapper: {
  marginBottom: 12,
},

select: {
  borderWidth: 3,
  borderColor: "#D3D3D3",
  borderRadius: 20,
  backgroundColor: "#FFF",
  height: 55,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 15,
},

selectOpen: {
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
},

selectText: {
  color: "#D3D3D3",
  fontSize: 14,
},

dropdown: {
  borderWidth: 3,
  borderColor: "#D3D3D3",
  borderTopWidth: 0,
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
  backgroundColor: "#FFF",
},

option: {
  padding: 15,
},

optionText: {
  color: "#D3D3D3",
  fontSize: 14,
},

arrowselect: {
  width: 16,
  height: 16,
},
photoPreview: {
  width: "100%",
  height: "100%",
  borderRadius: 15,
},
});