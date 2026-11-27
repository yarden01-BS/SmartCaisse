import os
import sys
from ctypes import windll, c_int, c_void_p, c_char_p, byref, create_string_buffer


def tester_biomini(
    chemin_dll: str = "./UFScanner.dll",
    fichier_sortie: str = "empreinte_test.bmp",
) -> None:
    chemin_absolu = os.path.abspath(chemin_dll)
    if not os.path.exists(chemin_absolu):
        print(f"Erreur : DLL introuvable à '{chemin_absolu}'.")
        return

    dossier_dll = os.path.dirname(chemin_absolu)
    if hasattr(os, "add_dll_directory"):
        os.add_dll_directory(dossier_dll)

    # Ajoute aussi au PATH classique pour les sous-DLL dépendantes
    os.environ["PATH"] = dossier_dll + os.pathsep + os.environ.get("PATH", "")

    ufscanner = windll.LoadLibrary(chemin_absolu)

    # Déclaration explicite des signatures de fonctions du SDK Suprema
    ufscanner.UFS_Init.argtypes = []
    ufscanner.UFS_Init.restype = c_int

    ufscanner.UFS_Uninit.argtypes = []
    ufscanner.UFS_Uninit.restype = c_int

    ufscanner.UFS_Update.argtypes = []
    ufscanner.UFS_Update.restype = c_int

    ufscanner.UFS_GetScannerNumber.argtypes = [c_void_p]
    ufscanner.UFS_GetScannerNumber.restype = c_int

    ufscanner.UFS_GetScannerHandle.argtypes = [c_int, c_void_p]
    ufscanner.UFS_GetScannerHandle.restype = c_int

    ufscanner.UFS_CaptureSingleImage.argtypes = [c_void_p]
    ufscanner.UFS_CaptureSingleImage.restype = c_int

    ufscanner.UFS_SaveCaptureImageBufferToBMP.argtypes = [c_void_p, c_char_p]
    ufscanner.UFS_SaveCaptureImageBufferToBMP.restype = c_int

    ufscanner.UFS_GetErrorString.argtypes = [c_int, c_char_p]
    ufscanner.UFS_GetErrorString.restype = c_int

    def afficher_erreur(etape: str, code_err: int) -> None:
        buf = create_string_buffer(256)
        ufscanner.UFS_GetErrorString(code_err, buf)
        print(f"[{etape}] Code : {code_err} -> {buf.value.decode('utf-8', errors='ignore')}")

    # 1. Initialisation
    code = ufscanner.UFS_Init()
    if code != 0:
        afficher_erreur("UFS_Init", code)
        return

    try:
        # 2. Rafraîchir la liste des périphériques USB (utile sur certains modèles)
        ufscanner.UFS_Update()

        # 3. Détection
        nb_lecteurs = c_int(0)
        code = ufscanner.UFS_GetScannerNumber(byref(nb_lecteurs))
        afficher_erreur("UFS_GetScannerNumber", code)
        print(f"Nombre de lecteurs détectés : {nb_lecteurs.value}")

        if code != 0 or nb_lecteurs.value <= 0:
            return

        # 4. Handle
        handle_lecteur = c_void_p()
        code = ufscanner.UFS_GetScannerHandle(0, byref(handle_lecteur))
        if code != 0 or not handle_lecteur.value:
            afficher_erreur("UFS_GetScannerHandle", code)
            return

        print("Posez votre doigt sur le capteur BioMini...")
        code = ufscanner.UFS_CaptureSingleImage(handle_lecteur)
        if code != 0:
            afficher_erreur("UFS_CaptureSingleImage", code)
            return

        code = ufscanner.UFS_SaveCaptureImageBufferToBMP(
            handle_lecteur,
            fichier_sortie.encode("utf-8"),
        )
        if code == 0:
            print(f"Succès ! Empreinte enregistrée dans '{fichier_sortie}'.")
        else:
            afficher_erreur("UFS_SaveCaptureImageBufferToBMP", code)

    finally:
        ufscanner.UFS_Uninit()


if __name__ == "__main__":
    dll_path = sys.argv[1] if len(sys.argv) > 1 else "./UFScanner.dll"
    tester_biomini(chemin_dll=dll_path)
