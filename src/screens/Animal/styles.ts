import { StyleSheet, Dimensions, useWindowDimensions, } from "react-native";
import { fonts } from '../../styles/fonts';

const { width } = Dimensions.get("window");
const { height } = Dimensions.get("window");
const HEADER_HEIGHT = Math.min(height * 0.68, 700);
export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },
headerImage: {
  width: "100%",
  height: HEADER_HEIGHT,

  borderBottomLeftRadius: 25,
  borderBottomRightRadius: 25,

  overflow: "hidden",
},
headerContent: {
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 60,
},

headerImageRadius: {

  borderBottomLeftRadius: 25,
  borderBottomRightRadius: 25,
},
overlay: {
  ...StyleSheet.absoluteFill,
  backgroundColor: "rgba(55, 36, 36, 0.33)",
  borderBottomLeftRadius: 25,
  borderBottomRightRadius: 25,
},
  backIcon: {
    width: 40,
    height: 40,
    marginTop: 15,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#F3F3F3",
    
  },

  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  editIcon: {
    width: 18,
    height: 18,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  newMeasurement: {
    backgroundColor: "#4D5C52",
    borderRadius: 20,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flex: 1,
  },
  report:{
    backgroundColor: "#F3F3F3",
    borderRadius: 20,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flex: 1,
  },
  newMeasurementText:{
    color: "#F3F3F3",
    fontWeight: "600",
    fontSize: 14,
  },
  reporttText:{
    color: "#282113",
    fontWeight: "600",
    fontSize: 14,
  },

  temperatureContainer: {
  marginTop: 20,
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
},

temperatureIcon: {
  width: "90%",
  height: 200,  
  resizeMode: "contain",
},

temperatureText: {
  position: "absolute",
  top: "50%",                  
  transform: [{ translateY: -20 }], 

  fontSize: 30,
  fontWeight: "bold",
  color: "#4D5C52",
},
legenda: {
  marginTop:20,
  fontSize: 14,
  color: "#F3F3F3",
  textAlign: "center",
  marginBottom: 5,
  fontWeight: "500",
},
  overlaytext: {
  position: "absolute",
  justifyContent: "center",
  alignItems: "center",
},


chartvar: {
  margin: 20,
  padding: 15,
},

chartHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
},

chartTitle: {
  fontSize: 16,
  fontWeight: "bold",

  flex: 1,
  flexShrink: 1,

  paddingRight: 10,
},

varContainer: {
  alignItems: "flex-end",
  flexShrink: 0, 
},
varLabel: {
  fontSize: 12,
  color: "#555",
},

varValue: {
  fontSize: 22,
  fontWeight: "bold",
  color: "#3C664B",
  flexShrink: 1, 
},

dateRow: {
  flexDirection: "row",
  marginTop: 10,
  gap: 10,
  flexWrap: "wrap", 
},

dateButton: {
  backgroundColor: "#eee",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 10,

  alignItems: "center",
  justifyContent: "center",

  minWidth: 80, 
},

  deleteButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: "#780406",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E2415",
    marginBottom: 15,
    textAlign: "center",
  },

  modalMessage: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 30,
    textAlign: "center",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f8f8",
  },

  modalButtonCancelText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },

  modalButtonDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#780406",
  },

  modalButtonDeleteText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

});