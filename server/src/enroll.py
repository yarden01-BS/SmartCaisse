import base64
import os
import sys
import time
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
MAX_TEMPLATE_SIZE = 1024  # Taille max standard d'un template Suprema en octets
CAPTURE_FAILED_CODE = -212  # UFS_ERR_CAPTURE_FAILED (timeout ou capture invalide)


def charger_sdk(chemin_dll: str):
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

    sdk.UFS_SaveCaptureImageBufferToBMP.argtypes = [c_void_p, c_char_p]
    sdk.UFS_SaveCaptureImageBufferToBMP.restype = c_int

    # UFS_Extract(HUFScanner, unsigned char* pTemplate, int* pnTemplateSize, int* pnEnrollQuality)
    sdk.UFS_Extract.argtypes = [
        c_void_p,
        POINTER(c_ubyte),
        POINTER(c_int),
        POINTER(c_int),
    ]
    sdk.UFS_Extract.restype = c_int

    sdk.UFS_GetErrorString.argtypes = [c_int, c_char_p]
    sdk.UFS_GetErrorString.restype = c_int

    return sdk


def afficher_erreur(sdk, etape: str, code_err: int) -> None:
    buf = create_string_buffer(256)
    sdk.UFS_GetErrorString(code_err, buf)
    msg = buf.value.decode("utf-8", errors="ignore")
    print(f"[{etape}] Code : {code_err} -> {msg}")


def capturer_avec_reessai(
    sdk,
    handle_lecteur: c_void_p,
    max_tentatives: int = 5,
    delai: float = 0.5,
) -> None:
    for tentative in range(1, max_tentatives + 1):
        print(f"Posez votre doigt sur le capteur BioMini... (tentative {tentative}/{max_tentatives})")
        code = sdk.UFS_CaptureSingleImage(handle_lecteur)
        if code == 0:
            return

        if code == CAPTURE_FAILED_CODE:
            afficher_erreur(sdk, "UFS_CaptureSingleImage", code)
            if tentative < max_tentatives:
                time.sleep(delai)
            continue

        afficher_erreur(sdk, "UFS_CaptureSingleImage", code)
        raise RuntimeError(f"Échec de la capture d'empreinte (code {code}).")

    raise RuntimeError("Échec de la capture d'empreinte après plusieurs tentatives.")


def extraire_template_token(
    sdk,
    handle_lecteur: c_void_p,
    fichier_bmp: str | None = "empreinte_test.bmp",
) -> str:
    capturer_avec_reessai(sdk, handle_lecteur)

    if fichier_bmp:
        code_bmp = sdk.UFS_SaveCaptureImageBufferToBMP(
            handle_lecteur,
            fichier_bmp.encode("utf-8"),
        )
        if code_bmp == 0:
            print(f"Image BMP enregistrée dans '{fichier_bmp}'.")
        else:
            afficher_erreur(sdk, "UFS_SaveCaptureImageBufferToBMP", code_bmp)

    template_buf = (c_ubyte * MAX_TEMPLATE_SIZE)()
    template_size = c_int(0)
    enroll_quality = c_int(0)

    code = sdk.UFS_Extract(
        handle_lecteur,
        template_buf,
        byref(template_size),
        byref(enroll_quality),
    )
    if code != 0:
        afficher_erreur(sdk, "UFS_Extract", code)
        raise RuntimeError("Échec de l'extraction du template.")

    print(
        f"Template extrait avec succès — qualité : {enroll_quality.value}, "
        f"taille : {template_size.value} octets."
    )
    raw_bytes = bytes(template_buf[: template_size.value])
    return base64.b64encode(raw_bytes).decode("utf-8")


def enrole_empreinte(
    chemin_dll: str = "./UFScanner.dll",
    fichier_sortie_bmp: str | None = "empreinte_test.bmp",
    fichier_token: Path = TOKEN_FILE,
) -> None:
    sdk = charger_sdk(chemin_dll)
    code = sdk.UFS_Init()
    if code != 0:
        afficher_erreur(sdk, "UFS_Init", code)
        return

    try:
        sdk.UFS_Update()

        nb_lecteurs = c_int(0)
        code = sdk.UFS_GetScannerNumber(byref(nb_lecteurs))
        if code != 0 or nb_lecteurs.value <= 0:
            afficher_erreur(sdk, "UFS_GetScannerNumber", code)
            print("Aucun lecteur BioMini détecté.")
            return

        handle_lecteur = c_void_p()
        code = sdk.UFS_GetScannerHandle(0, byref(handle_lecteur))
        if code != 0 or not handle_lecteur.value:
            afficher_erreur(sdk, "UFS_GetScannerHandle", code)
            return

        token = extraire_template_token(
            sdk,
            handle_lecteur,
            fichier_bmp=fichier_sortie_bmp,
        )
        fichier_token.write_text(token, encoding="utf-8")
        print(f"Token enregistré dans '{fichier_token.resolve()}'.")

    finally:
        sdk.UFS_Uninit()


if __name__ == "__main__":
    dll_path = sys.argv[1] if len(sys.argv) > 1 else "./UFScanner.dll"
    enrole_empreinte(chemin_dll=dll_path)