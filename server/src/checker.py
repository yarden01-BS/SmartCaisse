import base64
import os
import sys
from ctypes import (
    POINTER,
    byref,
    c_char_p,
    c_int,
    c_ubyte,
    c_void_p,
    create_string_buffer,
    windll,
)
from pathlib import Path

TOKEN_FILE = Path("template_token.txt")
MAX_TEMPLATE_SIZE = 1024


def charger_sdk_verification(chemin_dll: str):
    chemin_absolu = os.path.abspath(chemin_dll)
    if not os.path.exists(chemin_absolu):
        raise FileNotFoundError(f"DLL introuvable : '{chemin_absolu}'")

    dossier_dll = os.path.dirname(chemin_absolu)
    if hasattr(os, "add_dll_directory"):
        os.add_dll_directory(dossier_dll)
    os.environ["PATH"] = dossier_dll + os.pathsep + os.environ.get("PATH", "")

    sdk = windll.LoadLibrary(chemin_absolu)

    sdk.UFS_Init.argtypes = []
    sdk.UFS_Init.restype = c_int

    sdk.UFS_Uninit.argtypes = []
    sdk.UFS_Uninit.restype = c_int

    sdk.UFS_Update.argtypes = []
    sdk.UFS_Update.restype = c_int

    sdk.UFS_GetScannerNumber.argtypes = [POINTER(c_int)]
    sdk.UFS_GetScannerNumber.restype = c_int

    sdk.UFS_GetScannerHandle.argtypes = [c_int, POINTER(c_void_p)]
    sdk.UFS_GetScannerHandle.restype = c_int

    sdk.UFS_CaptureSingleImage.argtypes = [c_void_p]
    sdk.UFS_CaptureSingleImage.restype = c_int

    sdk.UFS_Extract.argtypes = [
        c_void_p,
        POINTER(c_ubyte),
        POINTER(c_int),
        POINTER(c_int),
    ]
    sdk.UFS_Extract.restype = c_int

    # Vérification 1:1 d'un template extrait contre un template de référence :
    # UFS_Verify(HUFScanner, unsigned char* pTemplate1, int nTemplate1Size,
    #            unsigned char* pTemplate2, int nTemplate2Size, int* pbVerify)
    sdk.UFS_Verify.argtypes = [
        c_void_p,
        POINTER(c_ubyte),
        c_int,
        POINTER(c_ubyte),
        c_int,
        POINTER(c_int),
    ]
    sdk.UFS_Verify.restype = c_int

    sdk.UFS_GetErrorString.argtypes = [c_int, c_char_p]
    sdk.UFS_GetErrorString.restype = c_int

    return sdk


def afficher_erreur(sdk, etape: str, code_err: int) -> None:
    buf = create_string_buffer(256)
    sdk.UFS_GetErrorString(code_err, buf)
    msg = buf.value.decode("utf-8", errors="ignore")
    print(f"[{etape}] Code : {code_err} -> {msg}")


def charger_template_depuis_fichier(fichier: Path) -> tuple[c_ubyte, int]:
    if not fichier.exists():
        raise FileNotFoundError(f"Fichier template introuvable : '{fichier}'")

    token_b64 = fichier.read_text(encoding="utf-8").strip()
    if not token_b64:
        raise ValueError(f"Le fichier '{fichier}' est vide.")

    raw_bytes = base64.b64decode(token_b64.encode("utf-8"))
    taille = len(raw_bytes)
    buf = (c_ubyte * taille)(*raw_bytes)
    return buf, taille


def valider_transaction(
    montant: float,
    devise: str = "XAF",
    chemin_dll: str = "./UFScanner.dll",
    fichier_token: Path = TOKEN_FILE,
) -> bool:
    buf_ref, taille_ref = charger_template_depuis_fichier(fichier_token)
    sdk = charger_sdk_verification(chemin_dll)

    code = sdk.UFS_Init()
    if code != 0:
        afficher_erreur(sdk, "UFS_Init", code)
        return False

    try:
        sdk.UFS_Update()
        nb_lecteurs = c_int(0)
        code = sdk.UFS_GetScannerNumber(byref(nb_lecteurs))
        if code != 0 or nb_lecteurs.value <= 0:
            afficher_erreur(sdk, "UFS_GetScannerNumber", code)
            print("Aucun lecteur BioMini détecté.")
            return False

        handle_lecteur = c_void_p()
        code = sdk.UFS_GetScannerHandle(0, byref(handle_lecteur))
        if code != 0 or not handle_lecteur.value:
            afficher_erreur(sdk, "UFS_GetScannerHandle", code)
            return False

        print("Transaction en cours : posez votre doigt pour vérifier...")
        code = sdk.UFS_CaptureSingleImage(handle_lecteur)
        if code != 0:
            afficher_erreur(sdk, "UFS_CaptureSingleImage", code)
            return False

        buf_live = (c_ubyte * MAX_TEMPLATE_SIZE)()
        taille_live = c_int(0)
        qualite_live = c_int(0)

        code = sdk.UFS_Extract(
            handle_lecteur,
            buf_live,
            byref(taille_live),
            byref(qualite_live),
        )
        if code != 0:
            afficher_erreur(sdk, "UFS_Extract", code)
            return False

        est_valide = c_int(0)
        code = sdk.UFS_Verify(
            handle_lecteur,
            buf_live,
            taille_live,
            buf_ref,
            taille_ref,
            byref(est_valide),
        )
        if code != 0:
            afficher_erreur(sdk, "UFS_Verify", code)
            return False

        if est_valide.value == 1:
            print(f"TRANSACTION VALIDÉE ({montant} {devise}) — empreinte confirmée.")
            return True

        print(f"TRANSACTION REFUSÉE ({montant} {devise}) — empreinte non reconnue.")
        return False

    finally:
        sdk.UFS_Uninit()


if __name__ == "__main__":
    dll_path = sys.argv[1] if len(sys.argv) > 1 else "./UFScanner.dll"
    valider_transaction(montant=15000, devise="XAF", chemin_dll=dll_path)