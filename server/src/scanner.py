"""Service de capture d'empreinte réutilisant la logique de test.py (Suprema BioMini 2)."""

import base64
import os
from ctypes import byref, c_int, c_void_p, windll
from pathlib import Path

# Réutilise la DLL comme dans server/test.py.
DLL_NAME = os.getenv("UFSCANNER_DLL", "UFScanner.dll")


class ScannerService:
    def __init__(self, dll_path: str | None = None):
        self.dll_path = dll_path or DLL_NAME
        self._ufscanner = None

    def _load(self):
        if self._ufscanner is not None:
            return self._ufscanner
        chemin_absolu = os.path.abspath(self.dll_path)
        if not os.path.exists(chemin_absolu):
            raise FileNotFoundError(f"DLL introuvable: {chemin_absolu}")
        dossier_dll = os.path.dirname(chemin_absolu)
        if hasattr(os, "add_dll_directory"):
            os.add_dll_directory(dossier_dll)
        os.environ["PATH"] = dossier_dll + os.pathsep + os.environ.get("PATH", "")
        ufscanner = windll.LoadLibrary(chemin_absolu)

        # Signatures (copiées de server/test.py)
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
        from ctypes import c_char_p

        ufscanner.UFS_SaveCaptureImageBufferToBMP.argtypes = [c_void_p, c_char_p]
        ufscanner.UFS_SaveCaptureImageBufferToBMP.restype = c_int
        ufscanner.UFS_GetErrorString.argtypes = [c_int, c_char_p]
        ufscanner.UFS_GetErrorString.restype = c_int
        self._ufscanner = ufscanner
        return ufscanner

    def capture_bmp(self) -> bytes:
        """Capture une image BMP (réutilise test.py). Renvoie les octets BMP."""
        ufscanner = self._load()
        code = ufscanner.UFS_Init()
        if code != 0:
            raise RuntimeError(f"UFS_Init failed: {code}")
        try:
            ufscanner.UFS_Update()
            nb = c_int(0)
            code = ufscanner.UFS_GetScannerNumber(byref(nb))
            if code != 0 or nb.value <= 0:
                raise RuntimeError(f"Aucun lecteur détecté (code {code})")
            handle = c_void_p()
            code = ufscanner.UFS_GetScannerHandle(0, byref(handle))
            if code != 0 or not handle.value:
                raise RuntimeError(f"UFS_GetScannerHandle failed: {code}")
            code = ufscanner.UFS_CaptureSingleImage(handle)
            if code != 0:
                raise RuntimeError(f"UFS_CaptureSingleImage failed: {code}")
            tmp_path = Path(os.getenv("TEMP", ".")) / "smartcaisse_capture.bmp"
            code = ufscanner.UFS_SaveCaptureImageBufferToBMP(handle, str(tmp_path).encode("utf-8"))
            if code != 0:
                raise RuntimeError(f"UFS_SaveCaptureImageBufferToBMP failed: {code}")
            return tmp_path.read_bytes()
        finally:
            ufscanner.UFS_Uninit()

    # TODO: test.py ne couvre pas l'extraction de template ni la comparaison 1:1.
    # Demander à l'utilisateur les fonctions SDK (ex: UFS_Extract, UFM_Verify 등)
    # avant d'implémenter enroll/verify côté agent. Pour l'instant on renvoie
    # l'image capturée encodée en base64 comme placeholder.
    def capture_template_base64(self) -> str:
        return base64.b64encode(self.capture_bmp()).decode("ascii")