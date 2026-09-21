
$files = Get-ChildItem -Recurse -Filter "*.ts" -Path "tests"

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $newContent = $content -replace 'downloaded: (\d+)', 'size_downloaded: $1'
    $newContent = $newContent -replace '\{ id: ('\w+'), title: ('\w+'), status: ('\w+') \}', '{ id: $1, title: $2, status: $3, type: "http", username: "admin", size: 1000 }'
    if ($content -ne $newContent) {
        Set-Content $file.FullName $newContent
    }
}

