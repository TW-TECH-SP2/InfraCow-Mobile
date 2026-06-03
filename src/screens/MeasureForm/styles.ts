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

  logo: {
    width: 52,
    height: 22,
  },

  subtitle: {
    marginTop: 60,
    fontSize: 18,
    fontWeight: 500,
    color: "#2E2415",
  },

   selectWrapper: {
  marginTop: 20,
},

select: {
  borderWidth: 2,
  borderColor: "#D3D3D3",
  borderRadius: 20,
  padding: 15,
  backgroundColor: "#fff",
  height: 60,

  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
arrowselect:{
    width: 21,
    height: 11,
},

selectOpen: {
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
},

dropdown: {
  borderWidth: 2,
  borderColor: "#D3D3D3",
  borderTopWidth: 0, 
  borderBottomLeftRadius: 20,
  borderBottomRightRadius: 20,
  backgroundColor: "#fff",
  overflow: "hidden",
},

selectedContent: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},

selectedImage: {
  width: 30,
  height: 30,
  borderRadius: 8,
  marginRight: 10,
},

selectText: {
  color: "#9B9B9B",
  fontSize: 16,
  fontWeight: "500",
},

  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  optionImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 10,
  },

  optionText: {
    fontSize: 14,
  },

  button: {
  backgroundColor: "#282113",
  padding: 18,
  borderRadius: 20,
  alignItems: "center",
  height: 60,
  marginTop: 80, 
},

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});