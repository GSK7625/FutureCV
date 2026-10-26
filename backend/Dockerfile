FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props ./
COPY src/FutureCV.Domain/FutureCV.Domain.csproj src/FutureCV.Domain/
COPY src/FutureCV.Application/FutureCV.Application.csproj src/FutureCV.Application/
COPY src/FutureCV.Infrastructure/FutureCV.Infrastructure.csproj src/FutureCV.Infrastructure/
COPY src/FutureCV.Api/FutureCV.Api.csproj src/FutureCV.Api/
RUN dotnet restore src/FutureCV.Api/FutureCV.Api.csproj
COPY src/ src/
RUN dotnet publish src/FutureCV.Api/FutureCV.Api.csproj -c Release --no-restore -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=app:app /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail --silent http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "FutureCV.Api.dll"]
