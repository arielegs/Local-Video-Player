; Custom NSIS script for Local Video Player context menu registration
; This is included by electron-builder

!macro customInstall
  SetShellVarContext current
  
  ; Get the installed app path
  StrCpy $0 "$INSTDIR\Local Video Player.exe"
  StrCpy $1 "$INSTDIR\icon.ico"
  
  ; Register context menu for folders
  WriteRegStr HKCU "Software\Classes\Directory\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\Directory\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\Directory\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  ; Register context menu for video file extensions
  WriteRegStr HKCU "Software\Classes\.mp4\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.mp4\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.mp4\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.mkv\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.mkv\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.mkv\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.avi\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.avi\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.avi\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.mov\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.mov\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.mov\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.webm\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.webm\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.webm\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.flv\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.flv\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.flv\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.wmv\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.wmv\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.wmv\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.ts\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.ts\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.ts\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.m3u8\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.m3u8\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.m3u8\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
  
  WriteRegStr HKCU "Software\Classes\.mpv\shell\Open-with-Local-Video-Player" "" "Open with Local Video Player"
  ${If} ${FileExists} "$1"
    WriteRegStr HKCU "Software\Classes\.mpv\shell\Open-with-Local-Video-Player" "Icon" "$1"
  ${EndIf}
  WriteRegStr HKCU "Software\Classes\.mpv\shell\Open-with-Local-Video-Player\command" "" '"$0" "--open" "%%1"'
!macroend

!macro customUnInstall
  SetShellVarContext current
  
  ; Remove folder context menu
  DeleteRegKey HKCU "Software\Classes\Directory\shell\Open-with-Local-Video-Player"
  
  ; Remove file extension context menus
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

