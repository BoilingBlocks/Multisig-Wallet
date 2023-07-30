import { css } from "../styled-system/css";

export const styles = {
  modalContainer: css({
    position: "absolute",
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  }),
  modalContent: css({
    boxShadow: "0px 6px 18px rgba(0, 0, 0, 0.2)",
    zIndex: 10000,
    width: "100%",
    maxWidth: "400px",
    height: "50%",
    backgroundColor: "rose.50",
    borderRadius: "xl",
    borderWidth: "medium",
    borderColor: "rose.300",
    display: "flex",
    flexDirection: "column",
  }),
  modalTitle: css({
    height: "50px",
    fontSize: "xl",
    color: "rose.400",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  }),
  modalBody: css({ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-evenly" }),
  ownersContent: css({ display: "flex", flexDirection: "column", alignItems: "center" }),
  ownersTitle: css({ color: "rose.400" }),
  ownersNoneText: css({ color: "red.800" }),
  ownersListContainer: css({
    height: "100px",
    width: "80%",
    overflow: "auto",
    background: "rose.200",
    borderRadius: "md",
  }),
  addOwners: css({ display: "flex", justifyContent: "center" }),
  addOwnersInput: css({ borderRadius: "md", borderWidth: "2px", borderColor: "rose.300" }),
  addOwnersButton: css({
    color: "white",
    backgroundColor: "rose.300",
    borderRadius: "lg",
    padding: "2",
    cursor: "pointer",
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.2)",
    transition: "all 0.3s ease 0s",
    _hover: {
      backgroundColor: "rose.500",
    },
    _active: {
      transform: "translateY(4px)",
    },
    _disabled: {
      backgroundColor: "gray.500",
      _hover: {
        backgroundColor: "gray.500",
      },
      _active: {
        transform: "translateY(0px)",
      },
    },
  }),
  requiredSigs: css({ display: "flex", flexDirection: "column", alignItems: "center" }),
  requiredSigsLabel: css({ color: "rose.400" }),
  requiredSigsInput: css({ borderRadius: "md", borderColor: "rose.300", borderWidth: "2px" }),
  modalActionButtonsContainer: css({ display: "flex", justifyContent: "flex-end" }),
  modalCancelButton: css({
    backgroundColor: "gray.50",
    color: "rose.300",
    padding: "3",
    borderRadius: "lg",
    borderColor: "rose.300",
    borderWidth: "thin",
    margin: "2",
    cursor: "pointer",
    _hover: {
      backgroundColor: "white",
    },
    transition: "all 0.3s ease 0s",
    _active: {
      transform: "translateY(4px)",
    },
  }),
  modalCreateWalletButton: css({
    backgroundColor: "rose.300",
    color: "white",
    padding: "3",
    margin: "2",
    borderRadius: "lg",
    cursor: "pointer",
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.2)",
    transition: "all 0.3s ease 0s",
    _hover: {
      backgroundColor: "rose.500",
    },
    _active: {
      transform: "translateY(4px)",
    },
    _disabled: {
      backgroundColor: "gray.500",
      _hover: {
        backgroundColor: "gray.500",
      },
      _active: {
        transform: "translateY(0px)",
      },
    },
  }),
} as const;
