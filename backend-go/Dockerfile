FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server ./cmd/server/main.go

# ── Final image（~25MB）──────────────────────────────────────────────────────
FROM alpine:3.20

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server

RUN mkdir -p /app/uploads

WORKDIR /app
EXPOSE 8080
ENV GIN_MODE=release
ENV UPLOAD_DIR=/app/uploads

ENTRYPOINT ["/server"]
