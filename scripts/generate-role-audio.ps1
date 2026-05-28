param(
    [string]$InputPath = "reports/audio/maysar-role-overview-script.txt",
    [string]$OutputPath = "reports/audio/maysar-role-overview.mp3",
    [string]$VoiceName = "Microsoft David Desktop",
    [int]$Rate = 2
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-FullPath {
    param([string]$PathValue)

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $PathValue))
}

$inputFullPath = Resolve-FullPath -PathValue $InputPath
if (-not (Test-Path -LiteralPath $inputFullPath)) {
    throw "Input script not found: $inputFullPath"
}

$outputFullPath = Resolve-FullPath -PathValue $OutputPath
$outputDirectory = Split-Path -Parent $outputFullPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}

$wavFullPath = [System.IO.Path]::ChangeExtension($outputFullPath, ".wav")
$scriptText = Get-Content -LiteralPath $inputFullPath -Raw
$paragraphs = $scriptText -split "(\r?\n){2,}" |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ }

if ($paragraphs.Count -eq 0) {
    throw "Input script is empty: $inputFullPath"
}

Add-Type -AssemblyName System.Speech
$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()

$installedVoices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name } | Where-Object { $_ }
if ($installedVoices.Count -eq 0) {
    throw "No System.Speech voices are installed."
}

$selectedVoice = $null
if ($installedVoices -contains $VoiceName) {
    try {
        $synth.SelectVoice($VoiceName)
        $selectedVoice = $VoiceName
    }
    catch {
    }
}

if (-not $selectedVoice) {
    foreach ($candidateVoice in $installedVoices) {
        try {
            $synth.SelectVoice($candidateVoice)
            $selectedVoice = $candidateVoice
            break
        }
        catch {
        }
    }
}

if (-not $selectedVoice) {
    throw "Could not activate any installed voice. Candidates: $($installedVoices -join ', ')"
}

$synth.Rate = $Rate
$synth.Volume = 100
$synth.SetOutputToWaveFile($wavFullPath)

try {
    foreach ($paragraph in $paragraphs) {
        $synth.Speak($paragraph)
    }
}
finally {
    $synth.Dispose()
}

& ffmpeg -y -i $wavFullPath -codec:a libmp3lame -q:a 2 $outputFullPath | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed while converting $wavFullPath to mp3."
}

Remove-Item -LiteralPath $wavFullPath -Force
Write-Output "Created audio file with voice '$selectedVoice': $outputFullPath"
