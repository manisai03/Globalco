package com.globalco.jobboard.common.exception;

/** A dependency service failed or was unreachable; surfaced to clients as 503. */
public class DownstreamServiceException extends RuntimeException {
    public DownstreamServiceException(String message) {
        super(message);
    }
}
