param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("bbs", "original")]
  [string]$Profile,
  [string]$PrinterName = "POS-80"
)

# Configura el driver POS-80 para dos escenarios. Requiere ejecutarse como
# administrador (Set-PrinterProperty modifica el DEVMODE del driver).
#
#   -Profile bbs       -> config que usa bbspos: el programa controla corte y
#                         gavetero (no los hace el driver), margen de salida 3mm.
#   -Profile original  -> config original del driver, para usarlo con otro
#                         sistema: abre gavetero antes de imprimir y corta
#                         despues de cada pagina.

$ProfileSettings = @{
  bbs = [ordered]@{
    "Config:zjCashDrawer"   = "zjNoCashDrawer"
    "Config:zjPaperCutting" = "zjNoCutting"
    "Config:zjTrailingMargin" = "zj3mm"
  }
  original = [ordered]@{
    "Config:zjCashDrawer"   = "zjEject1BeforePrint"
    "Config:zjPaperCutting" = "Option1"
    "Config:zjTrailingMargin" = "zj30mm"
  }
}

if (-not (Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue)) {
  Write-Error "No existe la impresora '$PrinterName'."
  exit 1
}

Write-Host "Aplicando perfil '$Profile' a '$PrinterName'..."
foreach ($kv in $ProfileSettings[$Profile].GetEnumerator()) {
  Set-PrinterProperty -PrinterName $PrinterName -PropertyName $kv.Key -Value $kv.Value
  Write-Host ("  {0} = {1}" -f $kv.Key, $kv.Value)
}
Write-Host "Listo."
