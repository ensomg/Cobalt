const { runPSJson, runPS } = require('./ps');

const TWEAKS = [
  {
    id: 'telemetry',
    category: 'privacy',
    title: 'Disable Telemetry',
    desc: 'Turn off Windows diagnostic data collection.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -EA Stop).AllowTelemetry -eq 0 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' AllowTelemetry -Value 0 -Type DWord`,
    revert: `Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' AllowTelemetry -EA SilentlyContinue`,
  },
  {
    id: 'ad-id',
    category: 'privacy',
    title: 'Disable Advertising ID',
    desc: 'Prevent apps from using your advertising ID.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Name Enabled -EA Stop).Enabled -eq 0 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' Enabled -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo' Enabled -Value 1 -Type DWord -EA SilentlyContinue`,
  },
  {
    id: 'activity-history',
    category: 'privacy',
    title: 'Disable Activity History',
    desc: 'Stop Windows from tracking your activity across devices.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name EnableActivityFeed -EA Stop).EnableActivityFeed -eq 0 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' EnableActivityFeed -Value 0 -Type DWord; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' PublishUserActivities -Value 0 -Type DWord; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' UploadUserActivities -Value 0 -Type DWord`,
    revert: `Remove-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Force -Recurse -EA SilentlyContinue`,
  },
  {
    id: 'location',
    category: 'privacy',
    title: 'Disable Location Tracking',
    desc: 'Turn off system-wide location services.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Sensor\\Overrides\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}' -Name SensorPermissionState -EA Stop).SensorPermissionState -eq 0 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Sensor\\Overrides\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Sensor\\Overrides\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}' SensorPermissionState -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Sensor\\Overrides\\{BFA794E4-F964-4FDB-90F6-51056BFE4B44}' SensorPermissionState -Value 1 -EA SilentlyContinue`,
  },
  {
    id: 'bing-search',
    category: 'ai',
    title: 'Disable Bing in Start Menu',
    desc: 'Remove web results from Start menu search.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' -Name DisableSearchBoxSuggestions -EA Stop).DisableSearchBoxSuggestions -eq 1 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' DisableSearchBoxSuggestions -Value 1 -Type DWord; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search' BingSearchEnabled -Value 0 -Type DWord -EA SilentlyContinue`,
    revert: `Remove-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' DisableSearchBoxSuggestions -EA SilentlyContinue`,
  },
  {
    id: 'cortana',
    category: 'ai',
    title: 'Disable Cortana',
    desc: 'Disable the Cortana assistant.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' -Name AllowCortana -EA Stop).AllowCortana -eq 0 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' AllowCortana -Value 0 -Type DWord`,
    revert: `Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search' AllowCortana -EA SilentlyContinue`,
  },
  {
    id: 'copilot',
    category: 'ai',
    title: 'Disable Copilot',
    desc: 'Turn off Windows Copilot integration.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot' -Name TurnOffWindowsCopilot -EA Stop).TurnOffWindowsCopilot -eq 1 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot' TurnOffWindowsCopilot -Value 1 -Type DWord; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' ShowCopilotButton -Value 0 -Type DWord -EA SilentlyContinue`,
    revert: `Remove-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot' TurnOffWindowsCopilot -EA SilentlyContinue`,
  },
  {
    id: 'recall',
    category: 'ai',
    title: 'Disable Windows Recall',
    desc: 'Disable the AI Recall feature that snapshots your screen.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI' -Name DisableAIDataAnalysis -EA Stop).DisableAIDataAnalysis -eq 1 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI' DisableAIDataAnalysis -Value 1 -Type DWord`,
    revert: `Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI' DisableAIDataAnalysis -EA SilentlyContinue`,
  },
  {
    id: 'extensions',
    category: 'ui',
    title: 'Show File Extensions',
    desc: 'Always show file extensions in Explorer.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name HideFileExt -EA Stop).HideFileExt -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' HideFileExt -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' HideFileExt -Value 1 -Type DWord`,
  },
  {
    id: 'hidden-files',
    category: 'ui',
    title: 'Show Hidden Files',
    desc: 'Reveal hidden files and folders in Explorer.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name Hidden -EA Stop).Hidden -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' Hidden -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' Hidden -Value 2 -Type DWord`,
  },
  {
    id: 'widgets',
    category: 'ui',
    title: 'Disable Widgets on Taskbar',
    desc: 'Remove the Widgets icon from the taskbar.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name TaskbarDa -EA Stop).TaskbarDa -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarDa -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarDa -Value 1 -Type DWord`,
  },
  {
    id: 'chat',
    category: 'ui',
    title: 'Disable Chat on Taskbar',
    desc: 'Remove the Teams Chat icon from the taskbar.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name TaskbarMn -EA Stop).TaskbarMn -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarMn -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' TaskbarMn -Value 1 -Type DWord`,
  },
  {
    id: 'taskview',
    category: 'ui',
    title: 'Disable Task View Button',
    desc: 'Remove the Task View button from the taskbar.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name ShowTaskViewButton -EA Stop).ShowTaskViewButton -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' ShowTaskViewButton -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' ShowTaskViewButton -Value 1 -Type DWord`,
  },
  {
    id: 'classic-menu',
    category: 'ui',
    title: 'Restore Classic Right-Click Menu',
    desc: 'Bring back the classic Windows 10 context menu (Win11 only).',
    check: `Test-Path 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32'`,
    apply: `New-Item 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32' -Force -Value '' | Out-Null`,
    revert: `Remove-Item 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}' -Recurse -Force -EA SilentlyContinue`,
  },
  {
    id: 'suggested-content',
    category: 'ui',
    title: 'Disable Suggested Content',
    desc: 'Turn off ads/suggestions in Settings and Start.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name SubscribedContent-338393Enabled -EA Stop).'SubscribedContent-338393Enabled' -eq 0 } catch { $false }`,
    apply: `$keys=@('SubscribedContent-338393Enabled','SubscribedContent-353694Enabled','SubscribedContent-353696Enabled','SubscribedContent-338388Enabled','SubscribedContent-338389Enabled','SubscribedContent-310093Enabled','SubscribedContent-338387Enabled','SystemPaneSuggestionsEnabled','SilentInstalledAppsEnabled','SoftLandingEnabled','RotatingLockScreenOverlayEnabled','ContentDeliveryAllowed','OemPreInstalledAppsEnabled','PreInstalledAppsEnabled','PreInstalledAppsEverEnabled'); foreach ($k in $keys) { Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' $k -Value 0 -Type DWord -EA SilentlyContinue }`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' 'SubscribedContent-338393Enabled' -Value 1 -Type DWord -EA SilentlyContinue`,
  },
  {
    id: 'lockscreen-ads',
    category: 'ui',
    title: 'Disable Lock Screen Ads',
    desc: 'Stop tips and ads from appearing on the lock screen.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' -Name RotatingLockScreenOverlayEnabled -EA Stop).RotatingLockScreenOverlayEnabled -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' RotatingLockScreenOverlayEnabled -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' RotatingLockScreenOverlayEnabled -Value 1 -Type DWord`,
  },
  {
    id: 'this-pc',
    category: 'explorer',
    title: 'Open File Explorer to This PC',
    desc: 'Default Explorer landing page to This PC instead of Quick Access.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' -Name LaunchTo -EA Stop).LaunchTo -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' LaunchTo -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' LaunchTo -Value 2 -Type DWord`,
  },
  {
    id: 'end-task',
    category: 'explorer',
    title: 'Enable End Task in Taskbar',
    desc: 'Right-click a taskbar app → End Task option (Win11 23H2+).',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings' -Name TaskbarEndTask -EA Stop).TaskbarEndTask -eq 1 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings' TaskbarEndTask -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings' TaskbarEndTask -Value 0 -Type DWord -EA SilentlyContinue`,
  },
  {
    id: 'gamedvr',
    category: 'perf',
    title: 'Disable Game DVR',
    desc: 'Turn off background recording that can hurt game performance.',
    check: `try { (Get-ItemProperty 'HKCU:\\System\\GameConfigStore' -Name GameDVR_Enabled -EA Stop).GameDVR_Enabled -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\System\\GameConfigStore' GameDVR_Enabled -Value 0 -Type DWord; New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR' AllowGameDVR -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\System\\GameConfigStore' GameDVR_Enabled -Value 1 -Type DWord`,
  },
  {
    id: 'hibernate',
    category: 'perf',
    title: 'Disable Hibernate',
    desc: 'Reclaim disk space by disabling hiberfil.sys.',
    check: `(powercfg /a) -match 'Hibernation has not been enabled'`,
    apply: `powercfg -h off | Out-Null`,
    revert: `powercfg -h on | Out-Null`,
  },
  {
    id: 'fast-startup',
    category: 'perf',
    title: 'Disable Fast Startup',
    desc: 'Improves shutdown reliability and dual-boot compatibility (slightly slower boot).',
    check: `try { (Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power' -Name HiberbootEnabled -EA Stop).HiberbootEnabled -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power' HiberbootEnabled -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power' HiberbootEnabled -Value 1 -Type DWord`,
  },
  {
    id: 'sysmain',
    category: 'perf',
    title: 'Disable SysMain (Superfetch)',
    desc: 'Reduces disk activity on SSDs. Can hurt HDD performance. Recommended for SSD.',
    risk: 'warn',
    check: `try { (Get-Service SysMain -EA Stop).StartType -eq 'Disabled' } catch { $false }`,
    apply: `Set-Service SysMain -StartupType Disabled; Stop-Service SysMain -Force -EA SilentlyContinue`,
    revert: `Set-Service SysMain -StartupType Automatic; Start-Service SysMain -EA SilentlyContinue`,
  },
  {
    id: 'ultimate-perf',
    category: 'perf',
    title: 'Enable Ultimate Performance Plan',
    desc: 'Adds and activates the Ultimate Performance power scheme.',
    check: `(powercfg /list) -match 'Ultimate Performance.*\\*'`,
    apply: `powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 | Out-Null; $g = (powercfg /list) | Select-String 'Ultimate Performance' | ForEach-Object { ($_.ToString() -split ':')[1].Trim().Split(' ')[0] } | Select-Object -First 1; if ($g) { powercfg -setactive $g }`,
    revert: `powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e`,
  },
  {
    id: 'reserved-storage',
    category: 'perf',
    title: 'Disable Reserved Storage',
    desc: 'Reclaims ~7 GB reserved for Windows Update. Requires Windows to be up to date.',
    risk: 'warn',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ReserveManager' -Name ShippedWithReserves -EA Stop).ShippedWithReserves -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ReserveManager' ShippedWithReserves -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ReserveManager' ShippedWithReserves -Value 1 -Type DWord`,
  },
  {
    id: 'storage-sense',
    category: 'perf',
    title: 'Disable Storage Sense',
    desc: 'Prevent Windows from automatically deleting old files without asking.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy' -Name 01 -EA Stop).'01' -eq 0 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy' 01 -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy' 01 -Value 1 -Type DWord`,
  },
  {
    id: 'onedrive-startup',
    category: 'perf',
    title: 'Disable OneDrive Auto-Start',
    desc: 'Stop OneDrive from launching at login.',
    check: `try { -not (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' -Name OneDrive -EA Stop).OneDrive } catch { $true }`,
    apply: `Remove-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' -Name OneDrive -EA SilentlyContinue`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' OneDrive -Value '"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe" /background'`,
  },
  {
    id: 'timeline',
    category: 'privacy',
    title: 'Disable Timeline',
    desc: 'Turn off Windows Timeline / Task View activity feed.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name EnableActivityFeed -EA Stop).EnableActivityFeed -eq 0 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' EnableActivityFeed -Value 0 -Type DWord`,
    revert: `Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' EnableActivityFeed -EA SilentlyContinue`,
  },
  {
    id: 'clipboard-history',
    category: 'privacy',
    title: 'Disable Clipboard History',
    desc: 'Stop saving clipboard history across the system.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Name AllowClipboardHistory -EA Stop).AllowClipboardHistory -eq 0 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' AllowClipboardHistory -Value 0 -Type DWord`,
    revert: `Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System' AllowClipboardHistory -EA SilentlyContinue`,
  },
  {
    id: 'handwriting-data',
    category: 'privacy',
    title: 'Disable Handwriting Data Collection',
    desc: 'Stop Windows from collecting handwriting samples.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\InputPersonalization' -Name RestrictImplicitInkCollection -EA Stop).RestrictImplicitInkCollection -eq 1 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Microsoft\\InputPersonalization' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\InputPersonalization' RestrictImplicitInkCollection -Value 1 -Type DWord; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\InputPersonalization' RestrictImplicitTextCollection -Value 1 -Type DWord`,
    revert: `Remove-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\InputPersonalization' RestrictImplicitInkCollection -EA SilentlyContinue`,
  },
  {
    id: 'cloud-spell',
    category: 'privacy',
    title: 'Disable Cloud Spell Check',
    desc: 'Prevent Windows from sending typed text to Microsoft for spell check.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Input\\Settings' -Name InsightsEnabled -EA Stop).InsightsEnabled -eq 0 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Microsoft\\Input\\Settings' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Input\\Settings' InsightsEnabled -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Input\\Settings' InsightsEnabled -Value 1 -Type DWord`,
  },
  {
    id: 'feedback-freq',
    category: 'privacy',
    title: 'Disable Feedback Prompts',
    desc: 'Stop Windows asking for feedback.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules' -Name NumberOfSIUFInPeriod -EA Stop).NumberOfSIUFInPeriod -eq 0 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules' NumberOfSIUFInPeriod -Value 0 -Type DWord; Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules' PeriodInNanoSeconds -Value 0 -Type DWord`,
    revert: `Remove-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules' NumberOfSIUFInPeriod -EA SilentlyContinue`,
  },
  {
    id: 'tailored-exp',
    category: 'privacy',
    title: 'Disable Tailored Experiences',
    desc: 'Stop Microsoft from personalizing ads/tips based on your diagnostic data.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy' -Name TailoredExperiencesWithDiagnosticDataEnabled -EA Stop).TailoredExperiencesWithDiagnosticDataEnabled -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy' TailoredExperiencesWithDiagnosticDataEnabled -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy' TailoredExperiencesWithDiagnosticDataEnabled -Value 1 -Type DWord`,
  },
  {
    id: 'app-diag',
    category: 'privacy',
    title: 'Disable App Diagnostics',
    desc: 'Prevent apps from accessing diagnostic info about other apps.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics' -Name Value -EA Stop).Value -eq 'Deny' } catch { $false }`,
    apply: `Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics' Value -Value 'Deny'`,
    revert: `Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\appDiagnostics' Value -Value 'Allow'`,
  },
  {
    id: 'sync-settings',
    category: 'privacy',
    title: 'Disable Settings Sync',
    desc: 'Stop syncing Windows settings/passwords to your Microsoft account.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SettingSync' -Name SyncPolicy -EA Stop).SyncPolicy -eq 5 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SettingSync' SyncPolicy -Value 5 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SettingSync' SyncPolicy -Value 1 -Type DWord`,
  },
  {
    id: 'speech-online',
    category: 'privacy',
    title: 'Disable Online Speech Recognition',
    desc: 'Prevent voice data being sent to Microsoft.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy' -Name HasAccepted -EA Stop).HasAccepted -eq 0 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy' HasAccepted -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy' HasAccepted -Value 1 -Type DWord`,
  },
  {
    id: 'web-search',
    category: 'ai',
    title: 'Disable Web Search Suggestions',
    desc: 'Extra layer: block Cortana web search integration in Explorer.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' -Name DisableSearchBoxSuggestions -EA Stop).DisableSearchBoxSuggestions -eq 1 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' DisableSearchBoxSuggestions -Value 1 -Type DWord`,
    revert: `Remove-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' DisableSearchBoxSuggestions -EA SilentlyContinue`,
  },
  {
    id: 'news-widgets',
    category: 'ui',
    title: 'Disable News & Interests Widget',
    desc: 'Remove weather/news popup from taskbar.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds' -Name EnableFeeds -EA Stop).EnableFeeds -eq 0 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds' EnableFeeds -Value 0 -Type DWord`,
    revert: `Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Feeds' EnableFeeds -EA SilentlyContinue`,
  },
  {
    id: 'start-recently-added',
    category: 'ui',
    title: 'Hide Recently Added Apps in Start',
    desc: 'Clean up the Start menu suggestions row.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' -Name HideRecentlyAddedApps -EA Stop).HideRecentlyAddedApps -eq 1 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' HideRecentlyAddedApps -Value 1 -Type DWord`,
    revert: `Remove-ItemProperty 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' HideRecentlyAddedApps -EA SilentlyContinue`,
  },
  {
    id: 'spotlight',
    category: 'ui',
    title: 'Disable Windows Spotlight',
    desc: 'Turn off rotating lock screen images from Microsoft.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent' -Name DisableWindowsSpotlightFeatures -EA Stop).DisableWindowsSpotlightFeatures -eq 1 } catch { $false }`,
    apply: `New-Item 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent' -Force | Out-Null; Set-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent' DisableWindowsSpotlightFeatures -Value 1 -Type DWord`,
    revert: `Remove-ItemProperty 'HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent' DisableWindowsSpotlightFeatures -EA SilentlyContinue`,
  },
  {
    id: 'nagle',
    category: 'net',
    title: "Disable Nagle's Algorithm",
    desc: 'Lower latency in online games. May slightly increase network usage.',
    risk: 'warn',
    check: `try { $ifs = Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'; $any = $false; foreach ($i in $ifs) { $p = Get-ItemProperty $i.PSPath -EA SilentlyContinue; if ($p.TcpAckFrequency -eq 1 -and $p.TCPNoDelay -eq 1) { $any = $true } }; $any } catch { $false }`,
    apply: `Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces' | ForEach-Object { Set-ItemProperty $_.PSPath TcpAckFrequency -Value 1 -Type DWord -EA SilentlyContinue; Set-ItemProperty $_.PSPath TCPNoDelay -Value 1 -Type DWord -EA SilentlyContinue }`,
    revert: `Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces' | ForEach-Object { Remove-ItemProperty $_.PSPath TcpAckFrequency -EA SilentlyContinue; Remove-ItemProperty $_.PSPath TCPNoDelay -EA SilentlyContinue }`,
  },
  {
    id: 'net-throttle',
    category: 'net',
    title: 'Disable Network Throttling',
    desc: 'Improve throughput for network apps and games.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' -Name NetworkThrottlingIndex -EA Stop).NetworkThrottlingIndex -eq 0xFFFFFFFF } catch { $false }`,
    apply: `Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' NetworkThrottlingIndex -Value 0xFFFFFFFF -Type DWord`,
    revert: `Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' NetworkThrottlingIndex -Value 10 -Type DWord`,
  },
  {
    id: 'wifi-sense',
    category: 'privacy',
    title: 'Disable Wi-Fi Sense',
    desc: 'Stop sharing Wi-Fi passwords automatically with contacts.',
    check: `try { (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\default\\WiFi\\AllowAutoConnectToWiFiSenseHotspots' -Name value -EA Stop).value -eq 0 } catch { $false }`,
    apply: `New-Item 'HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\default\\WiFi\\AllowAutoConnectToWiFiSenseHotspots' -Force | Out-Null; Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\default\\WiFi\\AllowAutoConnectToWiFiSenseHotspots' value -Value 0 -Type DWord`,
    revert: `Set-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\default\\WiFi\\AllowAutoConnectToWiFiSenseHotspots' value -Value 1 -Type DWord`,
  },
  {
    id: 'game-mode',
    category: 'perf',
    title: 'Enable Game Mode',
    desc: 'Prioritizes CPU/GPU for foreground games.',
    check: `try { (Get-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\GameBar' -Name AutoGameModeEnabled -EA Stop).AutoGameModeEnabled -eq 1 } catch { $false }`,
    apply: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\GameBar' AutoGameModeEnabled -Value 1 -Type DWord`,
    revert: `Set-ItemProperty 'HKCU:\\SOFTWARE\\Microsoft\\GameBar' AutoGameModeEnabled -Value 0 -Type DWord`,
  },
];

const PRESETS = [
  {
    id: 'faster-pc',
    name: 'Faster PC',
    desc: 'Speed-focused set for SSD systems.',
    icon: 'fa-rocket',
    risk: 'safe',
    tweaks: ['hibernate', 'fast-startup', 'sysmain', 'gamedvr', 'ultimate-perf', 'net-throttle', 'timeline', 'clipboard-history', 'storage-sense', 'onedrive-startup'],
  },
  {
    id: 'privacy-ultra',
    name: 'Privacy Ultra',
    desc: 'Aggressive anti-telemetry and tracking cleanup.',
    icon: 'fa-user-secret',
    risk: 'safe',
    tweaks: ['telemetry', 'ad-id', 'activity-history', 'location', 'bing-search', 'cortana', 'copilot', 'recall', 'suggested-content', 'lockscreen-ads', 'timeline', 'clipboard-history', 'cloud-spell', 'handwriting-data', 'feedback-freq', 'tailored-exp', 'app-diag', 'sync-settings', 'speech-online', 'wifi-sense', 'spotlight', 'web-search'],
  },
  {
    id: 'gamer-boost',
    name: 'Gamer Boost',
    desc: 'Low-latency + performance for gaming.',
    icon: 'fa-gamepad',
    risk: 'warn',
    tweaks: ['gamedvr', 'game-mode', 'hibernate', 'fast-startup', 'sysmain', 'ultimate-perf', 'net-throttle', 'nagle', 'reserved-storage'],
  },
  {
    id: 'debloat-recommended',
    name: 'Debloat (Safe)',
    desc: "General recommended tweaks that won't break anything.",
    icon: 'fa-broom',
    risk: 'safe',
    tweaks: ['extensions', 'hidden-files', 'widgets', 'chat', 'taskview', 'classic-menu', 'suggested-content', 'lockscreen-ads', 'this-pc', 'end-task', 'ad-id', 'activity-history', 'timeline', 'news-widgets', 'start-recently-added', 'onedrive-startup'],
  },
  {
    id: 'silent-mode',
    name: 'Silent Mode',
    desc: 'Kill notifications, background nags, feedback prompts and telemetry.',
    icon: 'fa-volume-xmark',
    risk: 'safe',
    tweaks: ['telemetry', 'ad-id', 'feedback-freq', 'tailored-exp', 'sync-settings', 'suggested-content', 'lockscreen-ads', 'news-widgets', 'start-recently-added', 'spotlight', 'onedrive-startup', 'timeline', 'activity-history'],
  },
  {
    id: 'fresh-install',
    name: 'Fresh Install',
    desc: 'The complete post-install pass: safe debloat + privacy + basic speed.',
    icon: 'fa-sparkles',
    risk: 'safe',
    tweaks: ['extensions', 'hidden-files', 'widgets', 'chat', 'taskview', 'classic-menu', 'suggested-content', 'lockscreen-ads', 'this-pc', 'end-task', 'ad-id', 'activity-history', 'timeline', 'telemetry', 'location', 'bing-search', 'copilot', 'recall', 'onedrive-startup', 'news-widgets', 'start-recently-added', 'spotlight', 'gamedvr', 'fast-startup', 'hibernate', 'storage-sense', 'feedback-freq', 'tailored-exp', 'sync-settings', 'clipboard-history', 'wifi-sense'],
  },
];


const BLOAT_APPS = [
  { name: 'Microsoft.549981C3F5F10', label: 'Cortana' },
  { name: 'Microsoft.XboxApp', label: 'Xbox' },
  { name: 'Microsoft.XboxGamingOverlay', label: 'Xbox Game Bar' },
  { name: 'Microsoft.XboxIdentityProvider', label: 'Xbox Identity Provider' },
  { name: 'Microsoft.XboxSpeechToTextOverlay', label: 'Xbox Speech-to-Text' },
  { name: 'Microsoft.GamingApp', label: 'Xbox Console Companion' },
  { name: 'Microsoft.MicrosoftSolitaireCollection', label: 'Solitaire Collection' },
  { name: 'Microsoft.BingWeather', label: 'Weather' },
  { name: 'Microsoft.BingNews', label: 'News' },
  { name: 'Microsoft.WindowsFeedbackHub', label: 'Feedback Hub' },
  { name: 'Microsoft.MicrosoftOfficeHub', label: 'Office Hub' },
  { name: 'Microsoft.OfficeLens', label: 'Office Lens' },
  { name: 'Microsoft.SkypeApp', label: 'Skype' },
  { name: 'Microsoft.ZuneMusic', label: 'Groove Music' },
  { name: 'Microsoft.ZuneVideo', label: 'Movies & TV' },
  { name: 'Microsoft.WindowsMaps', label: 'Maps' },
  { name: 'MicrosoftTeams', label: 'MS Teams (personal)' },
  { name: 'MSTeams', label: 'MS Teams' },
  { name: 'Microsoft.Teams', label: 'MS Teams (alt)' },
  { name: 'Microsoft.People', label: 'People' },
  { name: 'Microsoft.MixedReality.Portal', label: 'Mixed Reality Portal' },
  { name: 'Microsoft.YourPhone', label: 'Phone Link' },
  { name: 'Microsoft.GetHelp', label: 'Get Help' },
  { name: 'Microsoft.Getstarted', label: 'Get Started / Tips' },
  { name: 'Microsoft.WindowsAlarms', label: 'Alarms & Clock' },
  { name: 'Microsoft.MicrosoftStickyNotes', label: 'Sticky Notes' },
  { name: 'Microsoft.WindowsSoundRecorder', label: 'Sound Recorder' },
  { name: 'Microsoft.Print3D', label: 'Print 3D' },
  { name: 'Microsoft.3DBuilder', label: '3D Builder' },
  { name: 'Microsoft.Microsoft3DViewer', label: '3D Viewer' },
  { name: 'Microsoft.MSPaint', label: 'Paint 3D' },
  { name: 'Microsoft.Copilot', label: 'Copilot' },
  { name: 'Microsoft.WindowsCopilot', label: 'Copilot (system)' },
  { name: 'Clipchamp.Clipchamp', label: 'Clipchamp' },
  { name: 'MicrosoftCorporationII.QuickAssist', label: 'Quick Assist' },
  { name: 'Microsoft.WindowsCommunicationsApps', label: 'Mail & Calendar' },
  { name: 'Microsoft.PowerAutomateDesktop', label: 'Power Automate' },
  { name: 'Microsoft.Todos', label: 'Microsoft To Do' },
  { name: 'Microsoft.OutlookForWindows', label: 'New Outlook' },
  { name: 'Microsoft.Whiteboard', label: 'Whiteboard' },
  { name: 'Microsoft.MicrosoftFamily', label: 'Family' },
];

function tweakMeta() {
  return TWEAKS.map((t) => ({ id: t.id, category: t.category, title: t.title, desc: t.desc, risk: t.risk || 'safe' }));
}

async function checkTweaks() {
  const assigns = TWEAKS.map((t, i) => `$v${i} = try { [bool](${t.check}) } catch { $false }`).join('; ');
  const inserts = TWEAKS.map((t, i) => `$r['${t.id}'] = $v${i}`).join('; ');
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
${assigns}
$r = [ordered]@{}
${inserts}
$r | ConvertTo-Json -Compress
`;
  const data = await runPSJson(script, { timeoutMs: 15000 });
  return data || {};
}

async function checkInstalledApps() {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$set = New-Object System.Collections.Generic.HashSet[string]
$roots = @(
  'HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\CurrentVersion\\AppModel\\Repository\\Packages',
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Appx\\AppxAllUserStore\\Applications'
)
foreach ($root in $roots) {
  if (Test-Path $root) {
    Get-ChildItem $root -Name | ForEach-Object {
      $n = ($_ -split '_')[0]
      if ($n) { [void]$set.Add($n) }
    }
  }
}
@($set) | ConvertTo-Json -Compress
`;
  const data = await runPSJson(script, { timeoutMs: 10000 });
  return Array.isArray(data) ? data : (data ? [data] : []);
}

async function checkAllStatus() {
  const [tweaks, installedApps] = await Promise.all([checkTweaks(), checkInstalledApps()]);
  return { tweaks, installedApps };
}

async function applyTweaks(ids, mode = 'apply') {
  const targets = TWEAKS.filter((t) => ids.includes(t.id));
  if (targets.length === 0) return { applied: [], failed: [] };
  const scripts = targets.map((t) => {
    const body = mode === 'revert' ? t.revert : t.apply;
    return `try { ${body}; Write-Host ('OK::${t.id}') } catch { Write-Host ('FAIL::${t.id}::' + $_.Exception.Message) }`;
  }).join(';');
  const script = `$ErrorActionPreference = 'SilentlyContinue'; ${scripts}`;
  const out = await runPS(script, { timeoutMs: 60000 });
  const applied = [];
  const failed = [];
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('OK::')) applied.push(line.slice(4));
    else if (line.startsWith('FAIL::')) {
      const [_, id, ...rest] = line.split('::');
      failed.push({ id, error: rest.join('::') });
    }
  }
  return { applied, failed };
}

async function uninstallApps(names) {
  if (!names || !names.length) return { removed: [], failed: [] };
  const arr = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(',');
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$names = @(${arr})
foreach ($n in $names) {
  try {
    $pkgs = Get-AppxPackage -AllUsers -Name $n
    if ($pkgs) {
      foreach ($p in $pkgs) { Remove-AppxPackage -Package $p.PackageFullName -AllUsers -EA SilentlyContinue }
    }
    $prov = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq $n }
    if ($prov) { Remove-AppxProvisionedPackage -Online -PackageName $prov.PackageName -EA SilentlyContinue | Out-Null }
    Write-Host ('OK::' + $n)
  } catch {
    Write-Host ('FAIL::' + $n + '::' + $_.Exception.Message)
  }
}
`;
  const out = await runPS(script, { timeoutMs: 180000 });
  const removed = [];
  const failed = [];
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('OK::')) removed.push(line.slice(4));
    else if (line.startsWith('FAIL::')) {
      const [_, id, ...rest] = line.split('::');
      failed.push({ id, error: rest.join('::') });
    }
  }
  return { removed, failed };
}

async function listStartupItems() {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$roots = @(
  @{ scope='HKCU'; path='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' },
  @{ scope='HKLM'; path='HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' },
  @{ scope='HKLM32'; path='HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run' }
)
$approvedRoots = @(
  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run',
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
)
$out = @()
foreach ($r in $roots) {
  if (-not (Test-Path $r.path)) { continue }
  $k = Get-Item $r.path
  foreach ($name in $k.GetValueNames()) {
    $enabled = $true
    foreach ($ar in $approvedRoots) {
      $s = Get-ItemProperty $ar -Name $name -EA SilentlyContinue
      if ($s) {
        $b = $s.$name
        if ($b -and $b[0] -eq 3) { $enabled = $false }
      }
    }
    $out += [ordered]@{
      name    = $name
      command = $k.GetValue($name)
      scope   = $r.scope
      keyPath = $r.path
      enabled = $enabled
    }
  }
}
$out | ConvertTo-Json -Compress -Depth 3
`;
  const data = await runPSJson(script, { timeoutMs: 15000 });
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

async function toggleStartup(item, enable) {
  const scope = item.scope === 'HKCU' ? 'HKCU' : 'HKLM';
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$path = '${scope}:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
if (-not (Test-Path $path)) { New-Item $path -Force | Out-Null }
$bytes = ${enable ? '[byte[]](0x02,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00)' : '[byte[]](0x03,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00)'}
Set-ItemProperty $path '${item.name.replace(/'/g, "''")}' -Value $bytes -Type Binary
Write-Host 'OK'
`;
  return await runPS(script, { timeoutMs: 8000 });
}

async function removeStartup(item) {
  const script = `Remove-ItemProperty '${item.keyPath}' -Name '${item.name.replace(/'/g, "''")}' -EA SilentlyContinue; Write-Host 'OK'`;
  return await runPS(script, { timeoutMs: 8000 });
}

const SERVICE_SUGGESTIONS = [
  { name: 'DiagTrack',                  title: 'Connected User Experiences and Telemetry', suggested: 'Disabled', risk: 'safe' },
  { name: 'dmwappushservice',           title: 'WAP Push Message Routing',                  suggested: 'Disabled', risk: 'safe' },
  { name: 'MapsBroker',                 title: 'Downloaded Maps Manager',                   suggested: 'Manual',   risk: 'safe' },
  { name: 'lfsvc',                      title: 'Geolocation Service',                       suggested: 'Manual',   risk: 'safe' },
  { name: 'RetailDemo',                 title: 'Retail Demo Service',                       suggested: 'Disabled', risk: 'safe' },
  { name: 'WSearch',                    title: 'Windows Search',                            suggested: 'Manual',   risk: 'warn' },
  { name: 'XblAuthManager',             title: 'Xbox Live Auth Manager',                    suggested: 'Manual',   risk: 'safe' },
  { name: 'XblGameSave',                title: 'Xbox Live Game Save',                       suggested: 'Manual',   risk: 'safe' },
  { name: 'XboxGipSvc',                 title: 'Xbox Accessory Management',                 suggested: 'Manual',   risk: 'safe' },
  { name: 'XboxNetApiSvc',              title: 'Xbox Live Networking',                      suggested: 'Manual',   risk: 'safe' },
  { name: 'WerSvc',                     title: 'Windows Error Reporting',                   suggested: 'Manual',   risk: 'safe' },
  { name: 'PcaSvc',                     title: 'Program Compatibility Assistant',           suggested: 'Manual',   risk: 'safe' },
];

async function listServices() {
  const names = SERVICE_SUGGESTIONS.map((s) => `'${s.name}'`).join(',');
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$targets = @(${names})
$out = @()
foreach ($n in $targets) {
  $s = Get-Service -Name $n -EA SilentlyContinue
  if (-not $s) { continue }
  $cim = Get-CimInstance Win32_Service -Filter "Name='$n'" -EA SilentlyContinue
  $out += [ordered]@{
    name = $n
    displayName = $s.DisplayName
    status = "$($s.Status)"
    startType = if ($cim) { $cim.StartMode } else { "$($s.StartType)" }
  }
}
$out | ConvertTo-Json -Compress -Depth 3
`;
  const data = await runPSJson(script, { timeoutMs: 15000 });
  const list = data ? (Array.isArray(data) ? data : [data]) : [];
  return list.map((s) => {
    const meta = SERVICE_SUGGESTIONS.find((x) => x.name === s.name);
    return { ...s, title: meta ? meta.title : s.displayName, suggested: meta ? meta.suggested : null, risk: meta ? meta.risk : 'safe' };
  });
}

async function setServiceStartType(name, mode) {
  const map = { Automatic: 'Automatic', Manual: 'Manual', Disabled: 'Disabled' };
  const target = map[mode];
  if (!target) throw new Error('Invalid start mode');
  const script = `Set-Service -Name '${name.replace(/'/g, "''")}' -StartupType ${target} -EA Stop; Write-Host 'OK'`;
  return await runPS(script, { timeoutMs: 8000 });
}

async function runRepair(kind) {
  const commands = {
    sfc:   `sfc /scannow`,
    dism:  `DISM /Online /Cleanup-Image /RestoreHealth`,
    dns:   `ipconfig /flushdns`,
    netreset: `netsh winsock reset; netsh int ip reset`,
    chkdsk: `Write-Host 'chkdsk /f /r requires reboot. Schedule with: chkdsk C: /f'`,
  };
  const cmd = commands[kind];
  if (!cmd) throw new Error('Unknown repair kind');
  return await runPS(cmd, { timeoutMs: 15 * 60 * 1000 });
}

function presetMeta() {
  return PRESETS.map((p) => ({ id: p.id, name: p.name, desc: p.desc, icon: p.icon, risk: p.risk, tweakIds: p.tweaks }));
}

module.exports = {
  TWEAKS: tweakMeta(),
  PRESETS: presetMeta(),
  BLOAT_APPS,
  checkTweaks,
  checkInstalledApps,
  checkAllStatus,
  applyTweaks,
  uninstallApps,
  listStartupItems,
  toggleStartup,
  removeStartup,
  listServices,
  setServiceStartType,
  runRepair,
};
