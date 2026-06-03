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
    marginTop: 40,
    fontSize: 18,
    fontWeight: "500",
    color: "#2E2415",
  },

  search: {
    marginTop: 5,
    backgroundColor: "#EAEAEA",
    borderRadius: 15,
    height: 50,
    borderColor: "#C3C3C3",
    borderWidth: 2,

    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 12, 
  },

  sectionTitle: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
    color: "#2E2415",
  },

  card: {
    marginTop: 10,
    marginRight: 15,
  },

  cardImage: {
    width: 150,
    height: 150,
    justifyContent: "flex-start",
    padding: 10,
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  button: {
  backgroundColor: "#282113",
  padding: 18,
  borderRadius: 20,
  alignItems: "center",
  height: 60,
  marginTop: 30,
  marginBottom: 140, 
},

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  searchIcon:{
    width: 21.53,
    height: 21.53,
  },
  searchInput: {
  flex: 1,
  fontSize: 14,
  marginLeft: 10, 
  paddingVertical: 0, 
},
rfidsection: {
  backgroundColor: "#FFFFFF", 
  borderRadius: 15,
  padding: 15,
  marginVertical: 15,

  flexDirection: "row",
  alignItems: "center", 
  justifyContent: "space-between",
},

esquerda: {
  width: "43%", 
  justifyContent: "center",
  alignItems: "flex-start", 
},

direita: {
  width: "57%", 
  justifyContent: "center",
  alignItems: "center",
},
rfidTextverde: {
  color: "#4D5C52", 
  fontWeight: "600",
  fontSize: 14,
},

rfidTextresto: {
  color: "#000000", 
  fontWeight: "400",
  fontSize: 14,
},

rfidButton: {
  backgroundColor: "#3D674A",
  paddingVertical: 10,
  paddingHorizontal: 15,
  borderRadius: 15,

  flexDirection: "row",      
  alignItems: "center",      
  justifyContent: "center",  

  height: 50,
  width: "90%",
},

rfidButtonText: {
  color: "#FFFFFF",
  fontWeight: "600",
  fontSize: 14,
  marginLeft: 8, 
},

rfidimg: {
  width: 24,
  height: 24,
  resizeMode: "contain",
},
});