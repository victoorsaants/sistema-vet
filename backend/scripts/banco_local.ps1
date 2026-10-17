param(
    [ValidateSet("iniciar", "parar", "status")]
    [string]$Acao = "iniciar",
    [int]$Porta = 5433,
    [string]$Banco = "ajuvet"
)

$ErrorActionPreference = "Stop"
$Raiz = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$Pasta = Join-Path $Raiz ".banco_local"
$Dados = Join-Path $Pasta "dados"
$Log = Join-Path $Pasta "postgres.log"

function Encontrar-BinPostgres {
    $psql = Get-Command psql.exe -ErrorAction SilentlyContinue
    if ($psql) {
        return Split-Path $psql.Source
    }
    $instalados = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_ctl.exe" -ErrorAction SilentlyContinue |
        Sort-Object { [int]($_.Directory.Parent.Name -replace "\D", "") } -Descending
    if (-not $instalados) {
        throw "PostgreSQL não encontrado. Instale em https://www.postgresql.org/download/windows/ ou use o docker-compose.yml."
    }
    return $instalados[0].DirectoryName
}

$Bin = Encontrar-BinPostgres
$PgCtl = Join-Path $Bin "pg_ctl.exe"
$Psql = Join-Path $Bin "psql.exe"
$env:PGCLIENTENCODING = "UTF8"

function Esta-Rodando {
    & $PgCtl -D $Dados status *> $null
    return $LASTEXITCODE -eq 0
}

switch ($Acao) {
    "iniciar" {
        if (-not (Test-Path (Join-Path $Dados "PG_VERSION"))) {
            New-Item -ItemType Directory -Force $Pasta | Out-Null
            & (Join-Path $Bin "initdb.exe") -D $Dados -U postgres --auth=trust --encoding=UTF8 --locale=C | Out-Null
            Write-Host "Banco criado em $Dados"
        }
        if (Esta-Rodando) {
            Write-Host "O banco já está rodando na porta $Porta."
        }
        else {
            Start-Process -FilePath $PgCtl -WindowStyle Hidden -ArgumentList @(
                "-D", "`"$Dados`"", "-l", "`"$Log`"",
                "-o", "`"-p $Porta -c listen_addresses=localhost`"", "start"
            ) | Out-Null
            $tentativas = 0
            while (-not (Esta-Rodando) -and $tentativas -lt 30) {
                Start-Sleep -Milliseconds 500
                $tentativas++
            }
            if (-not (Esta-Rodando)) {
                throw "O banco não iniciou. Veja o log em $Log"
            }
            $PgIsReady = Join-Path $Bin "pg_isready.exe"
            $tentativas = 0
            do {
                & $PgIsReady -h localhost -p $Porta -U postgres *> $null
                $pronto = $LASTEXITCODE -eq 0
                if (-not $pronto) { Start-Sleep -Milliseconds 500 }
                $tentativas++
            } while (-not $pronto -and $tentativas -lt 60)
            if (-not $pronto) {
                throw "O banco não ficou pronto para conexões. Veja o log em $Log"
            }
            Write-Host "Banco rodando em localhost:$Porta"
        }
        $existe = & $Psql -h localhost -p $Porta -U postgres -tAc "select 1 from pg_database where datname = '$Banco'"
        if ($existe -ne "1") {
            & $Psql -h localhost -p $Porta -U postgres -c "create database $Banco" | Out-Null
            Write-Host "Base '$Banco' criada."
        }
    }
    "parar" {
        if (Esta-Rodando) {
            & $PgCtl -D $Dados -m fast stop | Out-Null
            Write-Host "Banco parado."
        }
        else {
            Write-Host "O banco não está rodando."
        }
    }
    "status" {
        if (Esta-Rodando) { Write-Host "Rodando em localhost:$Porta" } else { Write-Host "Parado." }
    }
}
