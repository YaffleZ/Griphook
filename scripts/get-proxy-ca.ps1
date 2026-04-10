$tcp = [System.Net.Sockets.TcpClient]::new("management.azure.com", 443)
$ssl = [System.Net.Security.SslStream]::new($tcp.GetStream(), $false, { $true })
$ssl.AuthenticateAsClient("management.azure.com")
$chain = [System.Security.Cryptography.X509Certificates.X509Chain]::new()
$chain.Build($ssl.RemoteCertificate)
$elements = $chain.ChainElements
Write-Host "Chain length: $($elements.Count)"
for ($i = 0; $i -lt $elements.Count; $i++) {
    $c = $elements[$i].Certificate
    Write-Host "[$i] Subject: $($c.Subject)"
    Write-Host "[$i] Issuer:  $($c.Issuer)"
    Write-Host "[$i] Expires: $($c.NotAfter)"
}
# Export the root (last in chain)
$root = $elements[$elements.Count - 1].Certificate
$pem = "-----BEGIN CERTIFICATE-----`n" + [Convert]::ToBase64String($root.RawData, [Base64FormattingOptions]::InsertLineBreaks) + "`n-----END CERTIFICATE-----"
$pem | Set-Content -Encoding ASCII "certs\corporate-ca.pem"
Write-Host "`nSaved root CA to certs\corporate-ca.pem"
$ssl.Close(); $tcp.Close()
