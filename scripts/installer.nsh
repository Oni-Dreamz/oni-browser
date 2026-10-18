!macro customInstall
  ; Register ProgID for HTML / Web handling
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML" "" "Oni Browser HTML Document"
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML" "FriendlyTypeName" "Oni Browser HTML Document"
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML" "AppUserModelId" "com.onilab.onibrowser"
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML\Application" "ApplicationCompany" "Oni Lab"
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML\Application" "ApplicationDescription" "Oni Browser - Sleek, fierce, uncompromised web browser for Windows."
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML\Application" "ApplicationIcon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML\Application" "ApplicationName" "${PRODUCT_NAME}"
  WriteRegStr SHCTX "Software\Classes\OniBrowserHTML\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  ; Register under Clients\StartMenuInternet for Windows browser detection
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}" "" "${PRODUCT_NAME}"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\DefaultIcon" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  
  ; Capabilities for Windows Default Apps settings
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities" "ApplicationName" "${PRODUCT_NAME}"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities" "ApplicationIcon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities" "ApplicationDescription" "Oni Browser - Sleek, fierce, uncompromised web browser for Windows."
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities" "StartMenu" "${PRODUCT_NAME}"
  
  ; URL Associations
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\URLAssociations" "http" "OniBrowserHTML"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\URLAssociations" "https" "OniBrowserHTML"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\URLAssociations" "ftp" "OniBrowserHTML"
  
  ; File Associations
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\FileAssociations" ".htm" "OniBrowserHTML"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\FileAssociations" ".html" "OniBrowserHTML"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\FileAssociations" ".shtml" "OniBrowserHTML"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\FileAssociations" ".xht" "OniBrowserHTML"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\FileAssociations" ".xhtml" "OniBrowserHTML"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\FileAssociations" ".svg" "OniBrowserHTML"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities\FileAssociations" ".webp" "OniBrowserHTML"

  ; Register in RegisteredApplications so Windows recognizes it in Default Apps
  WriteRegStr SHCTX "Software\RegisteredApplications" "${PRODUCT_NAME}" "Software\Clients\StartMenuInternet\${PRODUCT_NAME}\Capabilities"
!macroend

!macro customUnInstall
  DeleteRegKey SHCTX "Software\Clients\StartMenuInternet\${PRODUCT_NAME}"
  DeleteRegValue SHCTX "Software\RegisteredApplications" "${PRODUCT_NAME}"
  DeleteRegKey SHCTX "Software\Classes\OniBrowserHTML"
!macroend
