; Custom NSIS script for Local Video Player context menu registration
; This is included by electron-builder during the build process

!macro customInstall
  SetShellVarContext current
  
  ; The app executable will be in $INSTDIR with the name matching productName
  StrCpy $0 "$INSTDIR\Local Video Player.exe"
  StrCpy $1 "$INSTDIR\icon.ico"
  
  ; Log for debugging
  FileOpen $9 "$INSTDIR\install.log" a
  FileWrite $9 "Installing context menu for: $0$\r$\n"
  FileClose $9
  
  ; Register context menu for folders
  WriteRegStr HKCU "Software\Classes\Directory\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\Directory\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\Directory\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .mp4
  WriteRegStr HKCU "Software\Classes\.mp4\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.mp4\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.mp4\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .mkv
  WriteRegStr HKCU "Software\Classes\.mkv\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.mkv\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.mkv\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .avi
  WriteRegStr HKCU "Software\Classes\.avi\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.avi\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.avi\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .mov
  WriteRegStr HKCU "Software\Classes\.mov\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.mov\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.mov\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .webm
  WriteRegStr HKCU "Software\Classes\.webm\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.webm\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.webm\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .flv
  WriteRegStr HKCU "Software\Classes\.flv\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.flv\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.flv\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .wmv
  WriteRegStr HKCU "Software\Classes\.wmv\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.wmv\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.wmv\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .ts
  WriteRegStr HKCU "Software\Classes\.ts\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.ts\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.ts\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .m3u8
  WriteRegStr HKCU "Software\Classes\.m3u8\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.m3u8\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.m3u8\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
  
  ; Register for .mpv
  WriteRegStr HKCU "Software\Classes\.mpv\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.mpv\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.mpv\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%1"'
!macroend

!macro customUnInstall
  SetShellVarContext current
  DeleteRegKey HKCU "Software\Classes\Directory\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.mp4\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.mkv\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.avi\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.mov\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.webm\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.flv\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.wmv\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.ts\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.m3u8\shell\Open-with-Local-Video-Player"
  DeleteRegKey HKCU "Software\Classes\.mpv\shell\Open-with-Local-Video-Player"
!macroend


