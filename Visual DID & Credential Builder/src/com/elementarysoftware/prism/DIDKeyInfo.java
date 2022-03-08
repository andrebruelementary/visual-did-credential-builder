package com.elementarysoftware.prism;

import io.iohk.atala.prism.identity.PrismKeyType;

public class DIDKeyInfo {
	
	//public static final String KEY_TYPE_AUTHENTICATION = "Authentication";
	public static final String KEY_TYPE_ISSUING = "Issuing";
	public static final String KEY_TYPE_MASTER = "Master";
	public static final String KEY_TYPE_REVOCATION = "Revocation";
	private int keyType;
	private int keyIndex;
	private String keyName;
	
	/**
	 * @param type - int, must correspond to one of the constants of io.iohk.atala.prism.identity.PrismKeyType
	 * @param keyIndex - int, index of key in DID
	 * @param keyName - String, if "" is provided, name of key will be set to default name of key type on addition to DID
	 */
	public DIDKeyInfo(int type, int keyIndex) {
		this("", type, keyIndex);
	}

	public DIDKeyInfo(String name, int type, int keyIndex) {
		super();
		this.keyType = type;
		this.keyIndex = keyIndex;
		this.keyName = name;
	}

	public int getKeyType() {
		return keyType;
	}

	public int getKeyIndex() {
		return keyIndex;
	}
	
	public String getKeyName() {
		return keyName;
	}

}
