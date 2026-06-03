import { StyleSheet, Dimensions, } from "react-native";
import { fonts } from '../../styles/fonts';

const { width } = Dimensions.get("window");
export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },

headerImage: {
  height: 350,
  padding: 20,
  justifyContent: "space-between",
  width, // 👈 aqui resolve de vez

  borderBottomLeftRadius: 25,
  borderBottomRightRadius: 25,
  overflow: "hidden",
},
headerImageRadius:{
    borderBottomLeftRadius: 25,
  borderBottomRightRadius: 25,
  overflow: "hidden",
},
overlay: {
  ...StyleSheet.absoluteFill,
  backgroundColor: "rgba(255, 255, 255, 0.42)", // 👈 bem mais leve
  borderBottomLeftRadius: 25,
  borderBottomRightRadius: 25,
},
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#2E2415",
    
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

  manageButton: {
    backgroundColor: "#282113",
    borderRadius: 20,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  manageIcon: {
    width: 22,
    height: 22,
    tintColor: "#fff",
  },

  manageText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  cardsContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 10,
  },

  leftCard: {
    flex: 1,
    height: 180,
    
    borderRadius: 20,
    padding: 10,
    justifyContent: "space-between",
  },

  rightColumn: {
    flex: 1,
    justifyContent: "space-between",
  },

  smallCard: {
    height: 85,
    backgroundColor: "#6B6F5A",
    borderRadius: 20,
    padding: 12,
    justifyContent: "space-between",
  },

  cardLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  cardLabelmaior: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  cardNumber: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "600",
  },

  cardNumbermaior: {
    color: "#fff",
    fontSize: 50,
    fontWeight: "500",
  },

  reportButton: {
    marginHorizontal: 20,
    backgroundColor: "#282113",
    borderRadius: 20,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  reportIcon: {
    width: 20,
    height: 20,
    tintColor: "#fff",
  },

  reportText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  subtitle: {
    marginTop: 25,
    fontSize: 20,
    fontWeight: "600",
    color: "#2E2415",
    textAlign: "center",
  },
  cowcard: {
    width: 35,
    height: 35,
  },
  cowcardWrapper: {
  flexDirection: "row",   
  alignItems: "center", 
  gap: 3,  
},
cowcardmini:{
    width: 20,
    height: 20,
},
temperatureContainer: {
  marginTop: 20,
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
},

temperatureIcon: {
  width: "90%",
  height: 200, // 👈 FIXA ISSO (ou valor proporcional ao design)
  resizeMode: "contain",
},

temperatureText: {
  position: "absolute",
  top: "50%",                  // 👈 vai pro meio vertical
  transform: [{ translateY: -20 }], // 👈 sobe metade do tamanho do texto

  fontSize: 20,
  fontWeight: "bold",
  color: "#4D5C52",
},
legenda: {
  marginTop:20,
  fontSize: 14,
  color: "#6B6F5A",
  textAlign: "center",
  marginBottom: 60,
  fontWeight: "500",
},
overlaytext: {
  position: "absolute",
  justifyContent: "center",
  alignItems: "center",
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