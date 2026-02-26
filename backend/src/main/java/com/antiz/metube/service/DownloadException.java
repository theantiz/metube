package com.antiz.metube.service;

public class DownloadException extends RuntimeException {
    private final int statusCode;

    public DownloadException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
